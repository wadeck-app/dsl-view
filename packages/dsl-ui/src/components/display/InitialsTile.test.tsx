import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InitialsTile } from './InitialsTile.js';

describe('InitialsTile', () => {
	const original = HTMLCanvasElement.prototype.getContext;
	afterEach(() => {
		HTMLCanvasElement.prototype.getContext = original;
		vi.restoreAllMocks();
	});

	it('shifts the letters so their measured ink is centered in the tile', () => {
		// jsdom has no 2D canvas: answer with fixed metrics (ink 1..10 in a 14px box -> +1.5px).
		const ctx = {
			font: '',
			letterSpacing: '',
			measureText: (text: string) => ({
				width: 14,
				actualBoundingBoxLeft: text === 'H' ? 0 : -1,
				actualBoundingBoxRight: text === 'H' ? 8 : 10,
				actualBoundingBoxAscent: 8,
				fontBoundingBoxAscent: 10.66,
				fontBoundingBoxDescent: 2.66,
			}),
		};
		HTMLCanvasElement.prototype.getContext = (() => ctx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
		// jsdom applies no stylesheet: give the tile the computed text style a browser would resolve from its classes.
		vi.spyOn(window, 'getComputedStyle').mockReturnValue({ fontStyle: 'normal', fontWeight: '700', fontSize: '11px', fontFamily: 'sans-serif', letterSpacing: 'normal', lineHeight: '11px' } as unknown as CSSStyleDeclaration);
		const { container } = render(<InitialsTile text="BI" color="#0d9488" />);
		const letters = container.querySelector('[data-initials] > span') as HTMLElement;
		expect(letters.style.transform).toMatch(/^translate\(1\.50px, /);
	});

	it('shows the letters on the given color, hidden from assistive technology', () => {
		const { container } = render(<InitialsTile text="QU" color="#0d9488" />);
		const tile = container.firstElementChild as HTMLElement;
		expect(tile).toHaveAttribute('aria-hidden', 'true');
		expect(tile).toHaveAttribute('data-initials', 'QU');
		expect(tile.textContent).toBe('QU');
		expect(tile.style.backgroundColor).toBe('rgb(13, 148, 136)');
	});

	it('has one size and white text', () => {
		const { container } = render(<InitialsTile text="AL" color="#e11d48" />);
		const classes = (container.firstElementChild as HTMLElement).className.split(/\s+/);
		for (const c of ['h-5', 'min-w-[20px]', 'text-[11px]', 'text-white', 'rounded-md']) {
			expect(classes).toContain(c);
		}
	});
});
