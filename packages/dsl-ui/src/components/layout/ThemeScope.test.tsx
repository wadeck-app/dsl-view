import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeScope } from './ThemeScope.js';

function scope(ui: React.ReactElement): HTMLElement {
	const { container } = render(ui);
	return container.firstElementChild as HTMLElement;
}

/*
 * The contract: the palette and the UA colour-scheme travel together, on one class, so they cannot
 * drift. Setting tokens without color-scheme is what puts a white scrollbar down a near-black panel.
 *
 * jsdom applies no stylesheet, so these assert the class that carries both (theme.css is covered by
 * theme.test.ts) rather than computed colours. The rendered result is checked in the browser via the
 * stories, where computed values are real.
 */
describe('ThemeScope', () => {
	it('applies the dark theme class, which carries palette and color-scheme together', () => {
		expect(scope(<ThemeScope theme="dark">x</ThemeScope>).className).toMatch(/(^|\s)dark(\s|$)/);
	});

	// The direction that did not work before: light only existed on :root, so it could not be
	// re-asserted on a subtree inside a dark app.
	it('applies the light theme class, so light inside dark is expressible', () => {
		expect(scope(<ThemeScope theme="light">x</ThemeScope>).className).toMatch(/(^|\s)light(\s|$)/);
	});

	it('never applies both themes at once', () => {
		expect(scope(<ThemeScope theme="dark">x</ThemeScope>).className).not.toMatch(/(^|\s)light(\s|$)/);
		expect(scope(<ThemeScope theme="light">x</ThemeScope>).className).not.toMatch(/(^|\s)dark(\s|$)/);
	});

	it('exposes the theme as an attribute, so a test or a debugger can see it', () => {
		expect(scope(<ThemeScope theme="dark">x</ThemeScope>).getAttribute('data-theme-scope')).toBe('dark');
	});
});

/*
 * Without a background, a scope sets this theme's TEXT colour over the surrounding theme's
 * background - dark-on-dark or light-on-light. Painting one by default is what stops that being
 * the easy mistake.
 */
describe('ThemeScope surface', () => {
	it('paints the page background by default', () => {
		const el = scope(<ThemeScope theme="dark">x</ThemeScope>);

		expect(el.className).toContain('bg-bg');
		expect(el.className).toContain('text-content');
	});

	it('paints a panel surface when asked', () => {
		expect(scope(<ThemeScope theme="dark" surface="panel">x</ThemeScope>).className).toContain('bg-surface');
	});

	// For a scope whose whole purpose is an explicit palette, where a token background would fight it.
	it('paints nothing when told none', () => {
		const el = scope(<ThemeScope theme="dark" surface="none">x</ThemeScope>);

		expect(el.className).not.toContain('bg-bg');
		expect(el.className).not.toContain('bg-surface');
	});
});

describe('ThemeScope custom palette', () => {
	// The terminal case: neither light nor dark, an explicit palette for the subtree.
	it('writes token overrides as CSS custom properties', () => {
		const el = scope(
			<ThemeScope theme="dark" surface="none" tokens={{ '--color-bg': '#111827', '--color-content': '#e5e7eb' }}>
				x
			</ThemeScope>,
		);

		expect(el.style.getPropertyValue('--color-bg')).toBe('#111827');
		expect(el.style.getPropertyValue('--color-content')).toBe('#e5e7eb');
	});

	it('sets no inline style when no palette is given', () => {
		expect(scope(<ThemeScope theme="dark">x</ThemeScope>).getAttribute('style')).toBeNull();
	});
});

describe('ThemeScope nesting', () => {
	// Custom properties inherit, so the NEAREST scope wins. Specificity would only matter if two
	// theme classes landed on the same element, which cannot happen here.
	it('keeps each level independent, alternating to any depth', () => {
		render(
			<ThemeScope theme="dark">
				<span data-testid="a">a</span>
				<ThemeScope theme="light">
					<span data-testid="b">b</span>
					<ThemeScope theme="dark">
						<span data-testid="c">c</span>
						<ThemeScope theme="light">
							<span data-testid="d">d</span>
						</ThemeScope>
					</ThemeScope>
				</ThemeScope>
			</ThemeScope>,
		);

		const themeOf = (id: string) =>
			screen.getByTestId(id).closest('[data-theme-scope]')!.getAttribute('data-theme-scope');

		expect(themeOf('a')).toBe('dark');
		expect(themeOf('b')).toBe('light');
		expect(themeOf('c')).toBe('dark');
		expect(themeOf('d')).toBe('light');
	});

	it('renders children rather than swallowing them', () => {
		render(<ThemeScope theme="dark"><span>hello</span></ThemeScope>);
		expect(screen.getByText('hello')).toBeInTheDocument();
	});

	it('keeps a caller class and emits no doubled whitespace', () => {
		const el = scope(<ThemeScope theme="dark" surface="none" className="p-4 rounded">x</ThemeScope>);

		expect(el.className).toContain('p-4');
		expect(el.className).not.toMatch(/\s{2}/);
	});
});
