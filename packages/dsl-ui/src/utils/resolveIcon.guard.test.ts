import { describe, expect, it, vi } from 'vitest';

import { resolveIcon } from './resolveIcon.js';

// The real lucide-react exports only icon components under PascalCase names today, so the "is it a component"
// guard cannot be told apart from "is it defined" with it. A stand-in module with the shapes the guard exists for
// (a plain function component, a forwardRef-like object, and PascalCase exports that are not components) can.
const { fn, ref } = vi.hoisted(() => ({ fn: () => null, ref: { $$typeof: Symbol.for('react.forward_ref'), render: () => null } }));
vi.mock('lucide-react', () => ({
	FnIcon: fn,
	RefIcon: ref,
	PlainObject: { notAnIcon: true },
	NullExport: null,
	TextExport: 'text',
	NumberExport: 5,
}));

describe('resolveIcon guard', () => {
	it('accepts a function component and a forwardRef-like object', () => {
		expect(resolveIcon('FnIcon')).toBe(fn);
		expect(resolveIcon('RefIcon')).toBe(ref);
	});

	it('refuses a PascalCase export that is not a component: plain object, null, string, number', () => {
		for (const name of ['PlainObject', 'NullExport', 'TextExport', 'NumberExport']) {
			expect(resolveIcon(name), name).toBeUndefined();
		}
	});
});
