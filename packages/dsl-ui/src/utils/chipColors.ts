// violations-suppress-start: tailwind/no-raw-color-class the border and hover shades are one value in
// both themes, so they need no token; the hue IS the meaning here, not a themed surface
export type ChipColor = 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'cyan';

export interface ChipColorClasses {
	active: string;
	inactive: string;
}

/*
 * Every palette is built from hue tokens, not from `bg-blue-100 dark:bg-blue-900/40` pairs.
 *
 * A Tailwind `dark:` variant applies under ANY `.dark` ancestor, so a chip inside a ThemeScope that
 * re-asserts light within a dark app kept its dark styling while everything around it went light -
 * measured at rgb(55,65,81) on a light panel. Custom properties resolve against the NEAREST scope
 * instead, which is what makes a chip nestable. See .claude/docs/theming.md.
 *
 * Each hue needs exactly two tokens, a tint and an ink, because that is all that differed between
 * the themes. Border and hover are one shade in both and stay literal.
 *
 * WRITTEN OUT, not generated from the hue name. Tailwind scans source TEXT for class names, so
 * `bg-hue-${hue}-bg` is a class Tailwind never sees and never emits - the element would carry an
 * attribute with no rule behind it and the chip would have no colour at all. A loop here would be
 * tidier and entirely broken.
 */
// @formatter:off
export const CHIP_COLOR_CLASSES: Record<ChipColor, ChipColorClasses> = {
	blue: {
		active:   'border-blue-400 bg-hue-blue-bg text-hue-blue',
		inactive: 'border-border text-muted hover:border-blue-300 hover:text-hue-blue',
	},
	green: {
		active:   'border-green-400 bg-hue-green-bg text-hue-green',
		inactive: 'border-border text-muted hover:border-green-300 hover:text-hue-green',
	},
	yellow: {
		active:   'border-yellow-400 bg-hue-yellow-bg text-hue-yellow',
		inactive: 'border-border text-muted hover:border-yellow-300 hover:text-hue-yellow',
	},
	orange: {
		active:   'border-orange-400 bg-hue-orange-bg text-hue-orange',
		inactive: 'border-border text-muted hover:border-orange-300 hover:text-hue-orange',
	},
	red: {
		active:   'border-red-400 bg-hue-red-bg text-hue-red',
		inactive: 'border-border text-muted hover:border-red-300 hover:text-hue-red',
	},
	purple: {
		active:   'border-purple-400 bg-hue-purple-bg text-hue-purple',
		inactive: 'border-border text-muted hover:border-purple-300 hover:text-hue-purple',
	},
	cyan: {
		active:   'border-cyan-400 bg-hue-cyan-bg text-hue-cyan',
		inactive: 'border-border text-muted hover:border-cyan-300 hover:text-hue-cyan',
	},
};
// @formatter:on
// violations-suppress-end: tailwind/no-raw-color-class

/**
 * The palette used when no colour is named - filter chips, the CronBuilder hour grid, the log
 * auto-scroll toggle.
 */
export const DEFAULT_CHIP_COLORS: ChipColorClasses = {
	active: 'border-border bg-muted-bg text-content',
	inactive: 'border-border text-muted hover:border-content',
};
