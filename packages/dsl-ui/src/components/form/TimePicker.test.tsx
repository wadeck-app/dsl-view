import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { TimePicker } from './TimePicker.js';

// Helper: render and open the popover
async function renderAndOpen(props: React.ComponentProps<typeof TimePicker>) {
	const user = userEvent.setup();
	render(<TimePicker {...props} />);
	const trigger = screen.getByRole('button', { name: props.value
		? (props.is12Hour
			? /^\d{2}:\d{2} (AM|PM)$/
			: /^\d{2}:\d{2}$/)
		: new RegExp(props.placeholder ?? 'Select a time\\.\\.\\.', 'i'),
	});
	await user.click(trigger);
	return { user, trigger };
}

describe('TimePicker', () => {
	describe('Rendering', () => {
		it('renders the trigger button with placeholder when value is null', () => {
			render(<TimePicker value={null} onChange={vi.fn()} placeholder="Pick a time" />);
			expect(screen.getByRole('button', { name: 'Pick a time' })).toBeInTheDocument();
		});

		it('renders with default placeholder when not specified', () => {
			render(<TimePicker value={null} onChange={vi.fn()} />);
			expect(screen.getByRole('button', { name: 'Select a time...' })).toBeInTheDocument();
		});

		it('displays selected time in 24h format', () => {
			render(<TimePicker value="14:30" onChange={vi.fn()} />);
			expect(screen.getByRole('button', { name: '14:30' })).toBeInTheDocument();
		});

		it('displays selected time in 12h format (PM)', () => {
			render(<TimePicker value="14:30" onChange={vi.fn()} is12Hour />);
			expect(screen.getByRole('button', { name: '02:30 PM' })).toBeInTheDocument();
		});

		it('displays selected time in 12h format (AM)', () => {
			render(<TimePicker value="09:15" onChange={vi.fn()} is12Hour />);
			expect(screen.getByRole('button', { name: '09:15 AM' })).toBeInTheDocument();
		});

		it('renders as disabled when disabled prop is set', () => {
			render(<TimePicker value={null} onChange={vi.fn()} disabled />);
			expect(screen.getByRole('button', { name: 'Select a time...' })).toBeDisabled();
		});

		it('does not open popover when disabled', async () => {
			render(<TimePicker value={null} onChange={vi.fn()} disabled />);
			const trigger = screen.getByRole('button', { name: 'Select a time...' });
			await userEvent.click(trigger);
			// Popover content should NOT appear
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});
	});

	describe('Popover', () => {
		it('opens the time panel when trigger is clicked', async () => {
			render(<TimePicker value="10:00" onChange={vi.fn()} />);
			const trigger = screen.getByRole('button', { name: '10:00' });
			await userEvent.click(trigger);
			expect(screen.getByRole('dialog', { name: 'Time picker' })).toBeInTheDocument();
		});

		it('shows hours and minutes spinbuttons inside the panel', async () => {
			render(<TimePicker value="10:30" onChange={vi.fn()} />);
			await userEvent.click(screen.getByRole('button', { name: '10:30' }));
			expect(screen.getByRole('spinbutton', { name: 'Hours' })).toBeInTheDocument();
			expect(screen.getByRole('spinbutton', { name: 'Minutes' })).toBeInTheDocument();
		});

		it('does not show AM/PM toggle in 24h mode', async () => {
			render(<TimePicker value="14:00" onChange={vi.fn()} />);
			await userEvent.click(screen.getByRole('button', { name: '14:00' }));
			expect(screen.queryByRole('button', { name: /toggle period/i })).not.toBeInTheDocument();
		});

		it('shows AM/PM toggle button in 12h mode', async () => {
			render(<TimePicker value="14:00" onChange={vi.fn()} is12Hour />);
			await userEvent.click(screen.getByRole('button', { name: '02:00 PM' }));
			expect(screen.getByRole('button', { name: /toggle period/i })).toBeInTheDocument();
		});

		it('shows "Now" button inside the panel', async () => {
			render(<TimePicker value="10:00" onChange={vi.fn()} />);
			await userEvent.click(screen.getByRole('button', { name: '10:00' }));
			expect(screen.getByRole('button', { name: 'Now' })).toBeInTheDocument();
		});
	});

	describe('Increment / Decrement', () => {
		it('increments hours when increment-hours button is clicked', async () => {
			const onChange = vi.fn();
			render(<TimePicker value="10:00" onChange={onChange} />);
			await userEvent.click(screen.getByRole('button', { name: '10:00' }));
			await userEvent.click(screen.getByRole('button', { name: 'Increment hours' }));
			expect(onChange).toHaveBeenCalledWith('11:00');
		});

		it('decrements hours when decrement-hours button is clicked', async () => {
			const onChange = vi.fn();
			render(<TimePicker value="10:00" onChange={onChange} />);
			await userEvent.click(screen.getByRole('button', { name: '10:00' }));
			await userEvent.click(screen.getByRole('button', { name: 'Decrement hours' }));
			expect(onChange).toHaveBeenCalledWith('09:00');
		});

		it('wraps hours from 23 to 00 on increment in 24h mode', async () => {
			const onChange = vi.fn();
			render(<TimePicker value="23:00" onChange={onChange} />);
			await userEvent.click(screen.getByRole('button', { name: '23:00' }));
			await userEvent.click(screen.getByRole('button', { name: 'Increment hours' }));
			expect(onChange).toHaveBeenCalledWith('00:00');
		});

		it('wraps hours from 00 to 23 on decrement in 24h mode', async () => {
			const onChange = vi.fn();
			render(<TimePicker value="00:00" onChange={onChange} />);
			await userEvent.click(screen.getByRole('button', { name: '00:00' }));
			await userEvent.click(screen.getByRole('button', { name: 'Decrement hours' }));
			expect(onChange).toHaveBeenCalledWith('23:00');
		});

		it('increments minutes when increment-minutes button is clicked', async () => {
			const onChange = vi.fn();
			render(<TimePicker value="10:30" onChange={onChange} />);
			await userEvent.click(screen.getByRole('button', { name: '10:30' }));
			await userEvent.click(screen.getByRole('button', { name: 'Increment minutes' }));
			expect(onChange).toHaveBeenCalledWith('10:31');
		});

		it('decrements minutes when decrement-minutes button is clicked', async () => {
			const onChange = vi.fn();
			render(<TimePicker value="10:30" onChange={onChange} />);
			await userEvent.click(screen.getByRole('button', { name: '10:30' }));
			await userEvent.click(screen.getByRole('button', { name: 'Decrement minutes' }));
			expect(onChange).toHaveBeenCalledWith('10:29');
		});

		it('rolls minutes over and increments hours when minutes reach 60', async () => {
			const onChange = vi.fn();
			render(<TimePicker value="10:59" onChange={onChange} />);
			await userEvent.click(screen.getByRole('button', { name: '10:59' }));
			await userEvent.click(screen.getByRole('button', { name: 'Increment minutes' }));
			expect(onChange).toHaveBeenCalledWith('11:00');
		});
	});

	describe('Minute step constraint', () => {
		it('increments by minuteStep when specified', async () => {
			const onChange = vi.fn();
			render(<TimePicker value="10:00" onChange={onChange} minuteStep={15} />);
			await userEvent.click(screen.getByRole('button', { name: '10:00' }));
			await userEvent.click(screen.getByRole('button', { name: 'Increment minutes' }));
			expect(onChange).toHaveBeenCalledWith('10:15');
		});

		it('decrements by minuteStep when specified', async () => {
			const onChange = vi.fn();
			render(<TimePicker value="10:30" onChange={onChange} minuteStep={15} />);
			await userEvent.click(screen.getByRole('button', { name: '10:30' }));
			await userEvent.click(screen.getByRole('button', { name: 'Decrement minutes' }));
			expect(onChange).toHaveBeenCalledWith('10:15');
		});

		it('rolls over minutes and increments hour with step=30', async () => {
			const onChange = vi.fn();
			render(<TimePicker value="10:30" onChange={onChange} minuteStep={30} />);
			await userEvent.click(screen.getByRole('button', { name: '10:30' }));
			await userEvent.click(screen.getByRole('button', { name: 'Increment minutes' }));
			expect(onChange).toHaveBeenCalledWith('11:00');
		});
	});

	describe('Keyboard support', () => {
		it('increments hours via ArrowUp on hours spinbutton', async () => {
			const onChange = vi.fn();
			render(<TimePicker value="10:00" onChange={onChange} />);
			await userEvent.click(screen.getByRole('button', { name: '10:00' }));
			const hourSpin = screen.getByRole('spinbutton', { name: 'Hours' });
			fireEvent.keyDown(hourSpin, { key: 'ArrowUp' });
			expect(onChange).toHaveBeenCalledWith('11:00');
		});

		it('decrements hours via ArrowDown on hours spinbutton', async () => {
			const onChange = vi.fn();
			render(<TimePicker value="10:00" onChange={onChange} />);
			await userEvent.click(screen.getByRole('button', { name: '10:00' }));
			const hourSpin = screen.getByRole('spinbutton', { name: 'Hours' });
			fireEvent.keyDown(hourSpin, { key: 'ArrowDown' });
			expect(onChange).toHaveBeenCalledWith('09:00');
		});

		it('increments minutes via ArrowUp on minutes spinbutton', async () => {
			const onChange = vi.fn();
			render(<TimePicker value="10:30" onChange={onChange} />);
			await userEvent.click(screen.getByRole('button', { name: '10:30' }));
			const minSpin = screen.getByRole('spinbutton', { name: 'Minutes' });
			fireEvent.keyDown(minSpin, { key: 'ArrowUp' });
			expect(onChange).toHaveBeenCalledWith('10:31');
		});

		it('decrements minutes via ArrowDown on minutes spinbutton', async () => {
			const onChange = vi.fn();
			render(<TimePicker value="10:30" onChange={onChange} />);
			await userEvent.click(screen.getByRole('button', { name: '10:30' }));
			const minSpin = screen.getByRole('spinbutton', { name: 'Minutes' });
			fireEvent.keyDown(minSpin, { key: 'ArrowDown' });
			expect(onChange).toHaveBeenCalledWith('10:29');
		});
	});

	describe('12h mode', () => {
		it('shows PM for hours >= 12', async () => {
			render(<TimePicker value="15:00" onChange={vi.fn()} is12Hour />);
			await userEvent.click(screen.getByRole('button', { name: '03:00 PM' }));
			expect(screen.getByRole('button', { name: /currently PM/i })).toBeInTheDocument();
		});

		it('shows AM for hours < 12', async () => {
			render(<TimePicker value="09:00" onChange={vi.fn()} is12Hour />);
			await userEvent.click(screen.getByRole('button', { name: '09:00 AM' }));
			expect(screen.getByRole('button', { name: /currently AM/i })).toBeInTheDocument();
		});

		it('toggles AM to PM when toggle button is clicked', async () => {
			const onChange = vi.fn();
			render(<TimePicker value="09:00" onChange={onChange} is12Hour />);
			await userEvent.click(screen.getByRole('button', { name: '09:00 AM' }));
			await userEvent.click(screen.getByRole('button', { name: /toggle period/i }));
			expect(onChange).toHaveBeenCalledWith('21:00');
		});

		it('toggles PM to AM when toggle button is clicked', async () => {
			const onChange = vi.fn();
			render(<TimePicker value="15:00" onChange={onChange} is12Hour />);
			await userEvent.click(screen.getByRole('button', { name: '03:00 PM' }));
			await userEvent.click(screen.getByRole('button', { name: /toggle period/i }));
			expect(onChange).toHaveBeenCalledWith('03:00');
		});

		it('displays 12 (not 0) for midnight in 12h mode', () => {
			render(<TimePicker value="00:00" onChange={vi.fn()} is12Hour />);
			expect(screen.getByRole('button', { name: '12:00 AM' })).toBeInTheDocument();
		});

		it('displays 12 (not 0) for noon in 12h mode', () => {
			render(<TimePicker value="12:00" onChange={vi.fn()} is12Hour />);
			expect(screen.getByRole('button', { name: '12:00 PM' })).toBeInTheDocument();
		});
	});

	describe('"Now" button', () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2024-01-15T14:35:00'));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('sets current time when Now is clicked', () => {
			const onChange = vi.fn();
			render(<TimePicker value="10:00" onChange={onChange} />);
			// Use fireEvent to avoid userEvent/fake-timer conflict
			fireEvent.click(screen.getByRole('button', { name: '10:00' }));
			fireEvent.click(screen.getByRole('button', { name: 'Now' }));
			expect(onChange).toHaveBeenCalledWith('14:35');
		});

		it('rounds to nearest minuteStep when Now is clicked with step', () => {
			const onChange = vi.fn();
			// System time is 14:35, with step=15 -> rounds to 14:30 (nearest)
			render(<TimePicker value="10:00" onChange={onChange} minuteStep={15} />);
			// Use fireEvent to avoid userEvent/fake-timer conflict
			fireEvent.click(screen.getByRole('button', { name: '10:00' }));
			fireEvent.click(screen.getByRole('button', { name: 'Now' }));
			// 35 rounded to nearest 15 = 30
			expect(onChange).toHaveBeenCalledWith('14:30');
		});
	});

	describe('Controlled behavior', () => {
		it('updates display when value prop changes', () => {
			const { rerender } = render(<TimePicker value="10:00" onChange={vi.fn()} />);
			expect(screen.getByRole('button', { name: '10:00' })).toBeInTheDocument();
			rerender(<TimePicker value="15:45" onChange={vi.fn()} />);
			expect(screen.getByRole('button', { name: '15:45' })).toBeInTheDocument();
		});

		it('handles transition from null to a value', () => {
			const { rerender } = render(<TimePicker value={null} onChange={vi.fn()} />);
			expect(screen.getByRole('button', { name: 'Select a time...' })).toBeInTheDocument();
			rerender(<TimePicker value="08:00" onChange={vi.fn()} />);
			expect(screen.getByRole('button', { name: '08:00' })).toBeInTheDocument();
		});

		it('handles transition from a value to null', () => {
			const { rerender } = render(<TimePicker value="08:00" onChange={vi.fn()} />);
			expect(screen.getByRole('button', { name: '08:00' })).toBeInTheDocument();
			rerender(<TimePicker value={null} onChange={vi.fn()} />);
			expect(screen.getByRole('button', { name: 'Select a time...' })).toBeInTheDocument();
		});
	});

	describe('Spinbutton ARIA', () => {
		it('hours spinbutton has correct aria-valuenow in 24h mode', async () => {
			render(<TimePicker value="14:30" onChange={vi.fn()} />);
			await userEvent.click(screen.getByRole('button', { name: '14:30' }));
			const hourSpin = screen.getByRole('spinbutton', { name: 'Hours' });
			expect(hourSpin).toHaveAttribute('aria-valuenow', '14');
		});

		it('hours spinbutton has correct aria-valuenow in 12h mode', async () => {
			render(<TimePicker value="14:30" onChange={vi.fn()} is12Hour />);
			await userEvent.click(screen.getByRole('button', { name: '02:30 PM' }));
			const hourSpin = screen.getByRole('spinbutton', { name: 'Hours' });
			// displayHours = 14 % 12 = 2
			expect(hourSpin).toHaveAttribute('aria-valuenow', '2');
		});

		it('minutes spinbutton has correct aria-valuenow', async () => {
			render(<TimePicker value="14:45" onChange={vi.fn()} />);
			await userEvent.click(screen.getByRole('button', { name: '14:45' }));
			const minSpin = screen.getByRole('spinbutton', { name: 'Minutes' });
			expect(minSpin).toHaveAttribute('aria-valuenow', '45');
		});
	});
});
