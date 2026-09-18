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
