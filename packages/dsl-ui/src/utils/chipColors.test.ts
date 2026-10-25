import { describe, expect, it } from 'vitest';

import { CHIP_COLOR_CLASSES, DEFAULT_CHIP_COLORS } from './chipColors.js';
import type { ChipColor } from './chipColors.js';

const COLORS = Object.keys(CHIP_COLOR_CLASSES) as ChipColor[];
const tokens = (classes: string) => classes.split(/\s+/).filter(Boolean);

// The palettes are written out as literal class names on purpose (Tailwind scans source text), so nothing but a test
// can notice a typo'd hue or a pair that quietly lost its dark-mode safety.
describe('chip color palettes', () => {
	it('covers exactly the documented hues', () => {
		expect([...COLORS].sort()).toEqual(['blue', 'cyan', 'green', 'orange', 'purple', 'red', 'yellow']);
	});

	it.each(COLORS)('%s: the active chip uses that hue\'s own tint and ink tokens, and no other hue', color => {
		const active = tokens(CHIP_COLOR_CLASSES[color].active);
		expect(active).toContain(`bg-hue-${color}-bg`);
		expect(active).toContain(`text-hue-${color}`);
		for (const other of COLORS.filter(c => c !== color)) {
			expect(active.join(' '), `${color} must not carry ${other}`).not.toContain(`hue-${other}`);
			expect(active.join(' '), `${color} must not carry ${other}`).not.toContain(`-${other}-`);
		}
	});

	it.each(COLORS)('%s: the inactive chip is neutral and only shows the hue on hover', color => {
		const inactive = tokens(CHIP_COLOR_CLASSES[color].inactive);
		expect(inactive).toContain('text-muted');
		expect(inactive).toContain(`hover:text-hue-${color}`);
		expect(inactive.some(t => t.startsWith('bg-hue-'))).toBe(false);
	});

	// A `dark:` variant keys off any `.dark` ancestor and cannot be nested in a ThemeScope (see theming.md).
	it('never uses a dark: variant, in any palette', () => {
		for (const classes of [...COLORS.flatMap(c => [CHIP_COLOR_CLASSES[c].active, CHIP_COLOR_CLASSES[c].inactive]), DEFAULT_CHIP_COLORS.active, DEFAULT_CHIP_COLORS.inactive]) {
			expect(classes).not.toMatch(/(^|\s)dark:/);
		}
	});

	it('the active and inactive palettes of a hue differ', () => {
		for (const color of COLORS) {
			expect(CHIP_COLOR_CLASSES[color].active).not.toBe(CHIP_COLOR_CLASSES[color].inactive);
		}
	});

	it('the default (no colour named) palette is neutral: no hue token', () => {
		expect(DEFAULT_CHIP_COLORS.active).not.toContain('hue-');
		expect(DEFAULT_CHIP_COLORS.inactive).not.toContain('hue-');
		expect(tokens(DEFAULT_CHIP_COLORS.active)).toContain('bg-muted-bg');
	});

	it('the default inactive chip is a bordered, muted chip that darkens its border on hover', () => {
		expect(tokens(DEFAULT_CHIP_COLORS.inactive)).toEqual(expect.arrayContaining(['border-border', 'text-muted', 'hover:border-content']));
	});
});
