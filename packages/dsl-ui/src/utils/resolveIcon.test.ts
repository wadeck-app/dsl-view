import { describe, expect, it } from 'vitest';
import * as LucideIcons from 'lucide-react';
import { resolveIcon } from './resolveIcon.js';

describe('resolveIcon', () => {
	it('resolves a known Lucide icon name to its component', () => {
		expect(resolveIcon('Sun')).toBe(LucideIcons.Sun);
		expect(resolveIcon('ArrowRight')).toBe(LucideIcons.ArrowRight);
	});

	it('returns undefined for an unknown icon name', () => {
		expect(resolveIcon('NotARealIconXyz')).toBeUndefined();
	});

	it('returns undefined for undefined input and for an empty name', () => {
		expect(resolveIcon(undefined)).toBeUndefined();
		expect(resolveIcon('')).toBeUndefined();
	});

	it('is case-sensitive: icon names are PascalCase exports', () => {
		expect(resolveIcon('sun')).toBeUndefined();
		expect(resolveIcon('SUN')).toBeUndefined();
	});

	// A YAML `icon: icons` must not hand lucide's catalogue object (or a factory) to React as a component.
	it('refuses lucide exports that are not icon components', () => {
		expect(resolveIcon('icons')).toBeUndefined();
		expect(resolveIcon('createLucideIcon')).toBeUndefined();
		expect(resolveIcon('default')).toBeUndefined();
	});

	it('refuses names that only exist on the prototype chain', () => {
		expect(resolveIcon('Object')).toBeUndefined();
		expect(resolveIcon('Constructor')).toBeUndefined();
	});
});
