import { describe, expect, it } from 'vitest';

import { contentKey, plainFormData } from './contentKey.js';

describe('contentKey', () => {
	it('is equal for two objects with the same content and differs when the content differs', () => {
		expect(contentKey({ a: 1, b: ['x'] })).toBe(contentKey({ a: 1, b: ['x'] }));
		expect(contentKey({ a: 1 })).not.toBe(contentKey({ a: 2 }));
	});

	it('treats null and undefined alike (no data)', () => {
		expect(contentKey(undefined)).toBe(contentKey(null));
		expect(contentKey(null)).toBe('null');
	});

	it('does not throw on a DOM element: the element carries no form data and is left out of the key', () => {
		const button = document.createElement('button');
		// What crashed the library "Create book" dialog: an element reaches the form as data, circular through React's fiber.
		(button as unknown as Record<string, unknown>)['__reactFiber$x'] = { stateNode: button };

		expect(() => contentKey({ title: 'Dune', currentTarget: button })).not.toThrow();
		expect(contentKey({ title: 'Dune', currentTarget: button })).toBe(contentKey({ title: 'Dune' }));
	});

	it('leaves events and functions out of the key as well', () => {
		expect(contentKey({ title: 'Dune', event: new Event('click'), cb: () => 1 })).toBe(contentKey({ title: 'Dune' }));
	});

	it('gives a value that cannot be serialised a key that never equals another, instead of throwing', () => {
		const cyclic: Record<string, unknown> = { title: 'Dune' };
		cyclic['self'] = cyclic;

		const first = contentKey(cyclic);
		const second = contentKey(cyclic);

		expect(first).toMatch(/^unserialisable:/);
		expect(second).not.toBe(first);
		expect(contentKey({ n: 1n })).toMatch(/^unserialisable:/);
	});

	describe('plainFormData', () => {
		it('drops top-level DOM nodes, events and functions, keeps everything else', () => {
			const button = document.createElement('button');
			const data = { title: 'Dune', n: 0, empty: '', nothing: null, nested: { keep: [1] }, el: button, ev: new Event('click'), cb: () => 1 };

			expect(plainFormData(data)).toStrictEqual({ title: 'Dune', n: 0, empty: '', nothing: null, nested: { keep: [1] } });
		});

		it('returns the very same object when there is nothing to drop (stable identity for effects)', () => {
			const data = { title: 'Dune' };
			expect(plainFormData(data)).toBe(data);
		});

		it('passes null and undefined through', () => {
			expect(plainFormData(null)).toBeNull();
			expect(plainFormData(undefined)).toBeUndefined();
		});
	});
});
