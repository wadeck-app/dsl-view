import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScrollArea } from './ScrollArea.js';

/*
 * The rule this component exists to enforce:
 *
 *   the scrollbar must match the surface it is drawn on, not the app theme.
 *
 * A log pane is dark in both themes, so its scrollbar is dark in both - correct, and what a
 * consumer already relies on. But a scroll area on an ordinary themed panel must NOT be forced
 * dark: it has to follow the theme, or a light-theme app gets a dark scrollbar on a white card.
 * That distinction is the whole point of `scheme`.
 */

function area(ui: React.ReactElement): HTMLElement {
	const { container } = render(ui);
	return container.firstElementChild as HTMLElement;
}

describe('ScrollArea scrollbar palette', () => {
	// The default. `color-scheme` is declared on the theme root and inherits, so the correct thing
	// for a themed panel is to say nothing at all.
	it('does not pin a palette by default, so a themed panel follows the theme', () => {
		const el = area(<ScrollArea>content</ScrollArea>);

		expect(el.className).not.toContain('color-scheme');
	});

	// For a panel that is dark whatever the theme.
	it('pins dark when asked, for a surface that does not follow the theme', () => {
		const el = area(<ScrollArea scheme="dark">content</ScrollArea>);

		expect(el.className).toContain('[color-scheme:dark]');
	});

	// The mirror case: a panel that stays light inside a dark theme.
	it('pins light when asked', () => {
		const el = area(<ScrollArea scheme="light">content</ScrollArea>);

		expect(el.className).toContain('[color-scheme:light]');
	});

	it('never pins both', () => {
		expect(area(<ScrollArea scheme="dark">c</ScrollArea>).className).not.toContain('[color-scheme:light]');
		expect(area(<ScrollArea scheme="light">c</ScrollArea>).className).not.toContain('[color-scheme:dark]');
	});
});

describe('ScrollArea scrolling', () => {
	/*
	 * Not cosmetic. A flex child is `min-height: auto`, so it grows to fit its content, never
	 * overflows, and therefore never scrolls - the scrollbar simply does not appear and any
	 * follow-the-tail behaviour silently does nothing. A consumer shipped exactly that.
	 */
	it('can shrink below its content, or it would never overflow', () => {
		expect(area(<ScrollArea>content</ScrollArea>).className).toContain('min-h-0');
	});

	it('scrolls vertically by default and locks the cross axis', () => {
		const el = area(<ScrollArea>content</ScrollArea>);

		expect(el.className).toContain('overflow-y-auto');
		expect(el.className).toContain('overflow-x-hidden');
	});

	it('scrolls horizontally when asked', () => {
		const el = area(<ScrollArea axis="horizontal">content</ScrollArea>);

		expect(el.className).toContain('overflow-x-auto');
		expect(el.className).toContain('overflow-y-hidden');
	});

	it('scrolls both ways when asked', () => {
		expect(area(<ScrollArea axis="both">c</ScrollArea>).className).toContain('overflow-auto');
	});

	it('renders its children and keeps a caller class', () => {
		const el = area(<ScrollArea className="h-40 bg-surface">hello</ScrollArea>);

		expect(el.textContent).toBe('hello');
		expect(el.className).toContain('h-40');
		expect(el.className).toContain('bg-surface');
	});

	// An empty `scheme` entry must not leave a double space that a className assertion then
	// misses. Cheap to get wrong when classes are concatenated.
	it('emits no doubled whitespace', () => {
		expect(area(<ScrollArea>c</ScrollArea>).className).not.toMatch(/\s{2}/);
	});
});
