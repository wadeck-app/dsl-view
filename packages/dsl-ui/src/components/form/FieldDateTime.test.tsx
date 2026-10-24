import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('a fixed clock for the Now shortcut', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date(2026, 8, 19, 14, 5, 30));
	});

	it('Now on an existing value sets exactly the current hour and minute and keeps the day', () => {
		const onChange = vi.fn();
		render(<FieldDateTime label="Run at" value={AT_0930} onChange={onChange} open />);

		fireEvent.click(screen.getByText('Now'));

		const next = onChange.mock.calls[0]![0] as Date;
		expect([next.getFullYear(), next.getMonth(), next.getDate()]).toEqual([2026, 8, 19]);
		expect([next.getHours(), next.getMinutes(), next.getSeconds(), next.getMilliseconds()]).toEqual([14, 5, 0, 0]);
	});

	it('a time held before any date lands exactly on the picked day', () => {
		const onChange = vi.fn();
		render(<FieldDateTime label="Run at" value={null} onChange={onChange} open />);

		fireEvent.click(screen.getByText('Now'));
		expect(screen.getByRole('button', { expanded: true })).toHaveTextContent('14:05');
		fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Sep 25, 2026' } });

		const next = onChange.mock.calls[0]![0] as Date;
		expect([next.getDate(), next.getHours(), next.getMinutes()]).toEqual([25, 14, 5]);
	});
});

describe('holding the time across a cleared date', () => {
	function Host({ initial }: { initial: Date | null }) {
		const [value, setValue] = React.useState<Date | null>(initial);
		return (
			<>
				<FieldDateTime label="Run at" value={value} onChange={setValue} />
				<button onClick={() => setValue(null)}>External reset</button>
				<output data-testid="emitted">{value ? value.toISOString() : 'null'}</output>
			</>
		);
	}

	it('clearing the date keeps the time shown, and picking a day again restores the moment with that time', () => {
		render(<Host initial={AT_0930} />);

		fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });
		expect(screen.getByTestId('emitted')).toHaveTextContent('null');
		expect(screen.getByRole('button', { name: /09:30/ })).toBeInTheDocument();

		fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Sep 25, 2026' } });
		expect(screen.getByTestId('emitted')).toHaveTextContent(new Date(2026, 8, 25, 9, 30).toISOString());
	});

	it('once a value exists the held time is gone: an external reset shows an empty time', () => {
		render(<Host initial={AT_0930} />);
		fireEvent.click(screen.getByText('External reset'));
		expect(screen.getByRole('button', { name: 'Select a time...' })).toBeInTheDocument();
	});
});

describe('minDate and maxDate', () => {
	function typeDay(text: string) {
		fireEvent.change(screen.getByRole('textbox'), { target: { value: text } });
	}

	function renderBounded(onChange = vi.fn()) {
		render(
			<FieldDateTime
				label="Run at"
				value={null}
				onChange={onChange}
				minDate={new Date(2026, 8, 1)}
				maxDate={new Date(2026, 8, 30)}
			/>,
		);
		return onChange;
	}

	it('a day before minDate is not emitted, the minDate day itself is', () => {
		const onChange = renderBounded();
		typeDay('Aug 31, 2026');
		expect(onChange).not.toHaveBeenCalled();
		typeDay('Sep 1, 2026');
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it('a day after maxDate is not emitted, the maxDate day itself is', () => {
		const onChange = renderBounded();
		typeDay('Oct 1, 2026');
		expect(onChange).not.toHaveBeenCalled();
		typeDay('Sep 30, 2026');
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it('isDateDisabled vetoes a day the same way', () => {
		const onChange = vi.fn();
		render(<FieldDateTime label="Run at" value={null} onChange={onChange} isDateDisabled={d => d.getDate() === 25} />);
		typeDay('Sep 25, 2026');
		expect(onChange).not.toHaveBeenCalled();
		typeDay('Sep 26, 2026');
		expect(onChange).toHaveBeenCalledTimes(1);
	});
});

describe('options passed to the halves', () => {
	it('dateFormat shapes what is shown and what is parsed', () => {
		const onChange = vi.fn();
		render(<FieldDateTime label="Run at" value={AT_0930} onChange={onChange} dateFormat="yyyy-MM-dd" />);
		expect(screen.getByRole('textbox')).toHaveValue('2026-09-19');
		fireEvent.change(screen.getByRole('textbox'), { target: { value: '2026-09-25' } });
		expect((onChange.mock.calls[0]![0] as Date).getDate()).toBe(25);
	});

	it('is12Hour shows the time with its period', () => {
		render(<FieldDateTime label="Run at" value={AT_0930} onChange={noop} is12Hour />);
		expect(screen.getByRole('button')).toHaveTextContent('09:30 AM');
	});

	it('minuteStep moves the minutes along the step grid', () => {
		const onChange = vi.fn();
		render(<FieldDateTime label="Run at" value={AT_0930} onChange={onChange} minuteStep={15} open />);
		fireEvent.click(screen.getByRole('button', { name: 'Increment minutes' }));
		const next = onChange.mock.calls[0]![0] as Date;
		expect([next.getHours(), next.getMinutes()]).toEqual([9, 45]);
	});

	it('both placeholders are used while empty', () => {
		render(<FieldDateTime label="Run at" value={null} onChange={noop} datePlaceholder="Pick a day" timePlaceholder="Pick an hour" />);
		expect(screen.getByPlaceholderText('Pick a day')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Pick an hour' })).toBeInTheDocument();
	});

	it('the controlled open state reaches the time half in both directions', () => {
		const onOpenChange = vi.fn();
		const { rerender } = render(<FieldDateTime label="Run at" value={AT_0930} onChange={noop} open={false} onOpenChange={onOpenChange} />);
		expect(screen.queryByRole('spinbutton', { name: 'Minutes' })).toBeNull();
		fireEvent.click(screen.getByRole('button'));
		expect(onOpenChange).toHaveBeenCalledWith(true);
		rerender(<FieldDateTime label="Run at" value={AT_0930} onChange={noop} open onOpenChange={onOpenChange} />);
		expect(screen.getByRole('spinbutton', { name: 'Minutes' })).toBeInTheDocument();
	});
});

describe('an invalid Date value', () => {
	it('is shown as empty with a warning instead of crashing the form', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		render(<FieldDateTime label="Run at" value={new Date('not a date')} onChange={noop} />);
		expect(screen.getByRole('textbox')).toHaveValue('');
		expect(screen.getByRole('button')).toHaveTextContent('Select a time...');
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('[FieldDateTime]'));
	});
});
