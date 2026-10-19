import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InitialsTile } from './InitialsTile.js';

describe('InitialsTile', () => {
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
