// The off state used a fixed light grey (bg-gray-300) and a white thumb: in the dark theme that is a bright pill with a thumb
// that barely stands out. The off track and thumb now come from the theme tokens, so they follow it.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Switch } from './Switch.js';

const thumb = () => screen.getByRole('switch').firstElementChild as HTMLElement;

describe('Switch theme', () => {
	it('uses no fixed grey: the off track is a tint of the muted token with an inset outline', () => {
		render(<Switch checked={false} onChange={vi.fn()} />);
		const track = screen.getByRole('switch');
		expect(track.className).not.toContain('gray-');
		expect(track).toHaveClass('bg-muted/30', 'ring-1', 'ring-inset', 'ring-muted/50');
	});

	it('the off thumb is the muted token (readable on the tinted track, in both themes)', () => {
		render(<Switch checked={false} onChange={vi.fn()} />);
		expect(thumb()).toHaveClass('bg-muted');
		expect(thumb()).not.toHaveClass('bg-white');
	});

	it('the focus indicator is the same outline on and off, and never a ring (the off track owns the ring)', () => {
		for (const checked of [false, true]) {
			const { unmount } = render(<Switch checked={checked} onChange={vi.fn()} />);
			const track = screen.getByRole('switch');
			expect(track).toHaveClass('focus-visible:outline', 'focus-visible:outline-2', 'focus-visible:outline-offset-2');
			expect(track.className).not.toMatch(/focus(-visible)?:ring/);
			unmount();
		}
	});

	it('the on state keeps the accent track and a white thumb', () => {
		render(<Switch checked onChange={vi.fn()} />);
		expect(screen.getByRole('switch').className).toContain('data-[state=checked]:bg-[var(--color-primary-solid)]');
		expect(thumb()).toHaveClass('bg-white');
		expect(thumb()).not.toHaveClass('bg-muted');
	});
});
