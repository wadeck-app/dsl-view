import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FieldDateTime } from './FieldDateTime.js';

/*
 * Tested, unlike its thin siblings, because it is not thin: FieldDate and FieldTime hand one value
 * straight to one picker, while this holds a single Date and has to split it into a date half and a
 * time half and put it back together. The seam is the whole component, and every interesting case
 * lives there -- a time chosen before any date, a date chosen without a time, and the date edit that
 * must not silently reset the hour to midnight.
 */

const noop = () => {};
const AT_0930 = new Date(2026, 8, 19, 9, 30);

describe('rendering', () => {
	it('labels the field once, on the date control', () => {
		render(<FieldDateTime label="Run at" value={null} onChange={noop} />);
		expect(screen.getByLabelText('Run at')).toBeInTheDocument();
	});

	it('shows both halves', () => {
		render(<FieldDateTime label="Run at" value={AT_0930} onChange={noop} />);
		expect(screen.getByRole('textbox')).toHaveValue('Sep 19, 2026');
		expect(screen.getByRole('button')).toHaveTextContent('09:30');
	});

	it('an empty value leaves both halves empty rather than defaulting to today', () => {
		render(<FieldDateTime label="Run at" value={null} onChange={noop} />);
		expect(screen.getByRole('textbox')).toHaveValue('');
		expect(screen.getByRole('button')).toHaveTextContent('Select a time...');
	});

	it('forwards description, required and error to the wrapper', () => {
		render(
			<FieldDateTime label="Run at" value={null} onChange={noop} description="When it fires" required error="Required" />,
		);
		expect(screen.getByText('When it fires')).toBeInTheDocument();
		expect(screen.getByRole('alert')).toHaveTextContent('Required');
		expect(screen.getByLabelText(/^Run at/)).toHaveAttribute('aria-required', 'true');
		expect(screen.getByLabelText(/^Run at/)).toHaveAttribute('aria-invalid', 'true');
	});

	it('disables both halves together', () => {
		render(<FieldDateTime label="Run at" value={AT_0930} onChange={noop} disabled />);
		expect(screen.getByRole('textbox')).toBeDisabled();
		expect(screen.getByRole('button')).toBeDisabled();
	});
});

describe('the date half', () => {
	it('keeps the time already chosen, rather than resetting it to midnight', () => {
		const onChange = vi.fn();
		render(<FieldDateTime label="Run at" value={AT_0930} onChange={onChange} />);

		fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Sep 25, 2026' } });

		expect(onChange).toHaveBeenCalledTimes(1);
		const next = onChange.mock.calls[0]![0] as Date;
		expect(next.getDate()).toBe(25);
		expect(next.getHours()).toBe(9);
		expect(next.getMinutes()).toBe(30);
	});

	/*
	 * Midnight only when nothing else is known. A date with no time is a real intent -- "that day" --
	 * and inventing the current hour would make the stored moment depend on when the form was filled in.
	 */
	it('a date chosen with no time set yet lands at midnight', () => {
		const onChange = vi.fn();
		render(<FieldDateTime label="Run at" value={null} onChange={onChange} />);

		fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Sep 25, 2026' } });

		const next = onChange.mock.calls[0]![0] as Date;
		expect(next.getHours()).toBe(0);
		expect(next.getMinutes()).toBe(0);
	});

	it('clearing the date clears the whole value', () => {
		const onChange = vi.fn();
		render(<FieldDateTime label="Run at" value={AT_0930} onChange={onChange} />);

		fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });

		expect(onChange).toHaveBeenCalledWith(null);
	});
});

describe('the time half', () => {
	it('keeps the date already chosen', () => {
		const onChange = vi.fn();
		render(<FieldDateTime label="Run at" value={AT_0930} onChange={onChange} open />);

		// The "Now" shortcut is the one control that sets a time without spinning through digits.
		fireEvent.click(screen.getByText('Now'));

		expect(onChange).toHaveBeenCalledTimes(1);
		const next = onChange.mock.calls[0]![0] as Date;
		expect(next.getFullYear()).toBe(2026);
		expect(next.getMonth()).toBe(8);
		expect(next.getDate()).toBe(19);
	});

	/*
	 * A time with no date cannot be placed on a calendar, and guessing today would quietly produce a
	 * moment in the past for anyone filling the form in the evening. The half is held until a date
	 * arrives rather than discarded, so the user does not have to enter it twice.
	 */
	it('a time chosen before any date does not fabricate a day', () => {
		const onChange = vi.fn();
		render(<FieldDateTime label="Run at" value={null} onChange={onChange} open />);

		fireEvent.click(screen.getByText('Now'));

		expect(onChange).not.toHaveBeenCalled();
	});

	it('the held time is applied as soon as a date is picked', () => {
		const onChange = vi.fn();
		render(<FieldDateTime label="Run at" value={null} onChange={onChange} open />);

		fireEvent.click(screen.getByText('Now'));
		expect(onChange).not.toHaveBeenCalled();
		// The trigger shows the pending time even though no value has been emitted.
		expect(screen.getByRole('button', { expanded: true })).not.toHaveTextContent('Select a time...');

		fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Sep 25, 2026' } });

		expect(onChange).toHaveBeenCalledTimes(1);
		const next = onChange.mock.calls[0]![0] as Date;
		expect(next.getDate()).toBe(25);
		// Not midnight: the time the user already chose was kept.
		expect(next.getHours() === 0 && next.getMinutes() === 0).toBe(false);
	});
});

describe('minDate and maxDate', () => {
	it('are passed to the date half', () => {
		render(
			<FieldDateTime
				label="Run at"
				value={AT_0930}
				onChange={noop}
				minDate={new Date(2026, 8, 1)}
				maxDate={new Date(2026, 8, 30)}
			/>,
		);
		// Rendering with bounds must not throw and must keep the current value visible.
		expect(screen.getByRole('textbox')).toHaveValue('Sep 19, 2026');
	});
});
