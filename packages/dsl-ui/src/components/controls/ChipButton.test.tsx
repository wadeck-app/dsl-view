import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChipButton } from './ChipButton.js';

function chip(props: Partial<React.ComponentProps<typeof ChipButton>> = {}): HTMLElement {
	render(<ChipButton active={false} onClick={vi.fn()} {...props}>09</ChipButton>);
	return screen.getByRole('button');
}

describe('ChipButton state is readable, not just visible', () => {
	// The only thing a test - or a screen reader - can hold the toggle to.
	it('reports its state through aria-pressed', () => {
		expect(chip({ active: true }).getAttribute('aria-pressed')).toBe('true');
	});

	it('reports the inactive state too, rather than omitting the attribute', () => {
		expect(chip({ active: false }).getAttribute('aria-pressed')).toBe('false');
	});
});

/*
 * Added for the hour grid in CronBuilder. The default active fill is `bg-gray-100`, which on a
 * white surface is barely distinguishable from unselected - acceptable for three filter chips
 * where the label carries the meaning, useless for picking hours out of twenty-four, where the
 * selection IS the content.
 */
describe('ChipButton emphasis', () => {
	// Tokens, not `bg-gray-100 dark:bg-gray-700`: a dark: variant keys off any .dark ancestor, so a
	// chip inside a light scope nested in a dark app stayed dark.
	// Matched as a standalone class, not a substring: the ghost base carries `hover:bg-muted-bg`, so
	// a plain toContain/not.toContain on 'bg-muted-bg' answers about the hover state instead.
	const FILL = /(^|\s)bg-muted-bg(\s|$)/;

	it('is subtle by default, drawn from the muted surface token', () => {
		const el = chip({ active: true });

		expect(el.className).toMatch(FILL);
		expect(el.className).not.toContain('dark:');
	});

	it('fills with the primary token when strong', () => {
		const el = chip({ active: true, emphasis: 'strong' });

		expect(el.className).toContain('bg-[var(--color-primary-solid)]');
		expect(el.className).not.toMatch(FILL);
	});

	// Strong is about the active state alone: an unselected chip must stay quiet either way, or a
	// grid of twenty-four would be a wall of blue.
	it('leaves the inactive state alone', () => {
		const el = chip({ active: false, emphasis: 'strong' });

		expect(el.className).not.toContain('bg-[var(--color-primary-solid)]');
	});

	// A caller that named a palette meant that palette.
	it('does not override an explicit colour', () => {
		const el = chip({ active: true, emphasis: 'strong', color: 'blue' });

		expect(el.className).not.toContain('bg-[var(--color-primary-solid)]');
	});
});

/*
 * The base variant must contribute NO colour, or it silently wins.
 *
 * ChipButton built on `ghost`, which names `text-muted` and `border-transparent`. Those collided with
 * the palette's `text-hue-*` and `border-*-400`, and a collision between two plain utilities is
 * settled by which one Tailwind emitted last -- not by the order they appear in the attribute. Both
 * went to ghost, so every coloured chip in the design system rendered with grey ink and no outline.
 * Measured on the log pane's "Live" chip: rgb(156,163,175) text on a green fill.
 *
 * jsdom applies no stylesheet, so this cannot assert the computed colour. It asserts the thing that
 * actually broke: the conflicting class is not on the element at all.
 */
describe('ChipButton palette is not fought by the button variant', () => {
	// Standalone, not a substring: `border` is a prefix of `border-green-400`, and the palettes carry
	// `hover:` variants of the very classes under test, so toContain answers the wrong question.
	// No escaping needed - every class here is letters, digits and hyphens.
	const standalone = (cls: string) => new RegExp(String.raw`(^|\s)${cls}(\s|$)`);

	it('an active coloured chip keeps its hue ink', () => {
		const el = chip({ active: true, color: 'green' });

		expect(el.className).toMatch(standalone('text-hue-green'));
		// The collision. `text-muted` is emitted after `text-hue-green`, so its presence means grey.
		expect(el.className).not.toMatch(standalone('text-muted'));
	});

	it('an active coloured chip keeps its outline', () => {
		const el = chip({ active: true, color: 'green' });

		expect(el.className).toMatch(standalone('border-green-400'));
		expect(el.className).not.toMatch(standalone('border-transparent'));
	});

	// The inactive palette names text-muted itself, which is fine -- what must not survive is the
	// variant erasing the border it asks for.
	it('an inactive chip keeps the border the palette asks for', () => {
		const el = chip({ active: false, color: 'green' });

		expect(el.className).toMatch(standalone('border-border'));
		expect(el.className).not.toMatch(standalone('border-transparent'));
	});

	// Geometry still comes from the variant: every variant carries `border` so buttons of different
	// variants are the same height.
	it('still carries the border width that keeps heights equal', () => {
		expect(chip({ active: true, color: 'green' }).className).toMatch(standalone('border'));
	});

	it('every hue keeps its own ink', () => {
		for (const color of ['blue', 'green', 'yellow', 'orange', 'red', 'purple', 'cyan'] as const) {
			const { container } = render(
				<ChipButton active color={color} onClick={vi.fn()}>x</ChipButton>
			);
			const el = container.querySelector('button')!;
			expect(el.className).toMatch(standalone(`text-hue-${color}`));
			expect(el.className).not.toMatch(standalone('text-muted'));
		}
	});
});
