import { describe, expect, it } from 'vitest';
import * as LucideIcons from 'lucide-react';
import { resolveIcon } from './resolveIcon.js';

describe('resolveIcon', () => {
	it('resolves a known Lucide icon name to its component', () => {
		expect(resolveIcon('Sun')).toBe(LucideIcons.Sun);
	});

	it('returns undefined for an unknown icon name', () => {
		expect(resolveIcon('NotARealIconXyz')).toBeUndefined();
	});

	it('returns undefined for undefined input', () => {
		expect(resolveIcon(undefined)).toBeUndefined();
	});
});
