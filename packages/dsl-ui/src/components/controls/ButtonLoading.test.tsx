// A button waiting for a request used to flash (an instant request toggled its look twice in a frame) and, with its spinner or its
// "Saving..." label, changed width. The animation now shows only after a short delay, stays long enough to be read, keeps the look of
// the button, and each style leaves the button its size at rest.
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Button } from './_Button.js';
import { LOADING_MIN_VISIBLE_MS, LOADING_SHOW_DELAY_MS, LOADING_STYLES } from './buttonLoading.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const button = () => screen.getByRole('button');
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

describe('loading animation timing', () => {
	it('is off for a request that ends before the delay: no flash', () => {
		const { rerender } = render(<Button loading loadingStyle="dots">Save</Button>);
		advance(LOADING_SHOW_DELAY_MS - 10);
		expect(button()).not.toHaveAttribute('data-loading');
		rerender(<Button loadingStyle="dots">Save</Button>);
		advance(1000);
		expect(button()).not.toHaveAttribute('data-loading');
	});

	it('appears after the delay and stays at least the minimum once shown', () => {
		const { rerender } = render(<Button loading loadingStyle="dots">Save</Button>);
		advance(LOADING_SHOW_DELAY_MS + 1);
		expect(button()).toHaveAttribute('data-loading', 'dots');
		rerender(<Button loadingStyle="dots">Save</Button>);
		advance(LOADING_MIN_VISIBLE_MS - 50);
		expect(button()).toHaveAttribute('data-loading', 'dots');
		advance(100);
		expect(button()).not.toHaveAttribute('data-loading');
	});

	it('is busy and not clickable at once, even before the animation shows', () => {
		render(<Button loading>Save</Button>);
		expect(button()).toBeDisabled();
		expect(button()).toHaveAttribute('aria-busy', 'true');
	});
});

describe('the look while waiting', () => {
	it('keeps the colour of the variant: the muted "off" fill is for a button that is off', () => {
		render(<Button variant="primary" loading>Save</Button>);
		expect(button().className).not.toMatch(/disabled:bg-muted-bg|disabled:text-muted|disabled:opacity/);
		expect(button().className).toContain('bg-[var(--color-primary-solid)]');
	});

	it('an explicitly off button keeps its off look, loading or not', () => {
		render(<Button variant="primary" disabled loading>Save</Button>);
		expect(button().className).toContain('disabled:bg-muted-bg');
	});
});

describe.each(LOADING_STYLES.filter(style => style !== 'spinner'))('style %s', style => {
	it('keeps the label in the flow and adds nothing around the button', () => {
		render(<Button loading loadingStyle={style}>Save</Button>);
		advance(LOADING_SHOW_DELAY_MS + 1);
		expect(button()).toHaveAttribute('data-loading', style);
		expect(button()).toHaveTextContent('Save');
		expect(button().querySelector('svg')).toBeNull();
		// Nothing animated takes room in the flow: layers are absolutely placed.
		for (const layer of Array.from(button().querySelectorAll('[aria-hidden="true"]'))) {
			expect(layer.className).toContain('absolute');
		}
	});

	it('gives the button its own size back as soon as it stops', () => {
		const { rerender } = render(<Button loading loadingStyle={style}>Save</Button>);
		advance(LOADING_SHOW_DELAY_MS + 1);
		rerender(<Button loadingStyle={style}>Save</Button>);
		advance(LOADING_MIN_VISIBLE_MS + 1);
		expect(button().querySelector('[aria-hidden="true"]')).toBeNull();
		expect(button()).not.toBeDisabled();
	});
});

describe('spinner (default)', () => {
	it('shows the arc after the delay', () => {
		render(<Button loading>Save</Button>);
		expect(button().querySelector('svg')).toBeNull();
		advance(LOADING_SHOW_DELAY_MS + 1);
		expect(button().querySelector('svg')).not.toBeNull();
	});
});
