import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LiveToggle } from './LiveToggle.js';

describe('LiveToggle', () => {
	it('when live: reads "live", is pressed, and offers to pause', () => {
		render(<LiveToggle live onChange={vi.fn()} />);

		const toggle = screen.getByRole('button', { name: 'live' });
		expect(toggle).toHaveAttribute('aria-pressed', 'true');
		expect(toggle).toHaveAttribute('title', 'Pause live refresh');
	});

	it('when paused: reads "paused", is not pressed, and offers to start', () => {
		render(<LiveToggle live={false} onChange={vi.fn()} />);

		const toggle = screen.getByRole('button', { name: 'paused' });
		expect(toggle).toHaveAttribute('aria-pressed', 'false');
		expect(toggle).toHaveAttribute('title', 'Start live refresh');
	});

	it('clicking asks for the opposite state, from both states', () => {
		const onChange = vi.fn();
		const { rerender } = render(<LiveToggle live onChange={onChange} />);

		fireEvent.click(screen.getByRole('button'));
		expect(onChange).toHaveBeenLastCalledWith(false);

		rerender(<LiveToggle live={false} onChange={onChange} />);
		fireEvent.click(screen.getByRole('button'));
		expect(onChange).toHaveBeenLastCalledWith(true);
		expect(onChange).toHaveBeenCalledTimes(2);
	});

	it('is a plain button, so it never submits a form it sits in', () => {
		render(<LiveToggle live onChange={vi.fn()} />);

		expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
	});
});
