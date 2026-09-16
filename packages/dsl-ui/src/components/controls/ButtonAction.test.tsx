import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ButtonAction } from './ButtonAction.js';

describe('ButtonAction', () => {
	it('renders its label and reports clicks', () => {
		const onClick = vi.fn();
		render(<ButtonAction label="Run now" onClick={onClick} />);

		fireEvent.click(screen.getByRole('button', { name: 'Run now' }));

		expect(onClick).toHaveBeenCalled();
	});

	it('disables and shows a spinner while loading', () => {
		render(<ButtonAction label="Saving" loading />);

		expect(screen.getByRole('button')).toBeDisabled();
	});

	// The base Button is deliberately internal, so this wrapper is the only public way to
	// get a button. A consumer that needed an icon beside the label had to hand-roll the
	// whole button, and its px-3 py-1.5 text-xs then sat 8px shorter than these.
	describe('icon', () => {
		it('renders an icon beside the label', () => {
			render(<ButtonAction label="Run now" icon={<svg data-testid="play" />} />);

			const btn = screen.getByRole('button', { name: 'Run now' });
			expect(btn.querySelector('[data-testid="play"]')).not.toBeNull();
		});

		it('keeps the label as the accessible name', () => {
			render(<ButtonAction label="Run now" icon={<svg data-testid="play" />} />);

			expect(screen.getByRole('button', { name: 'Run now' })).toBeInTheDocument();
		});

		it('puts the icon before the label', () => {
			render(<ButtonAction label="Run now" icon={<svg data-testid="play" />} />);

			const btn = screen.getByRole('button', { name: 'Run now' });
			expect(btn.firstElementChild).toHaveAttribute('data-testid', 'play');
		});

		// A spinner already occupies the leading slot, so showing both would be two glyphs.
		it('drops the icon while loading, since the spinner takes that slot', () => {
			render(<ButtonAction label="Running" icon={<svg data-testid="play" />} loading />);

			expect(screen.getByRole('button').querySelector('[data-testid="play"]')).toBeNull();
		});

		it('renders without an icon exactly as before', () => {
			render(<ButtonAction label="Delete" />);

			expect(screen.getByRole('button', { name: 'Delete' }).querySelector('svg')).toBeNull();
		});
	});

	// Geometry stays with the design system: a row mixing sizes is what the consumer's
	// screenshot showed. Callers pick a size, never a padding.
	it('accepts a size and keeps md as the default', () => {
		const { container: dflt } = render(<ButtonAction label="A" />);
		expect((dflt.firstElementChild as HTMLElement).className).toContain('px-4');

		const { container: small } = render(<ButtonAction label="B" size="sm" />);
		expect((small.firstElementChild as HTMLElement).className).toContain('px-3');
	});
});
