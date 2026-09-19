import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FieldDate } from './FieldDate.js';
import { FieldTime } from './FieldTime.js';
import { FieldDateRange } from './FieldDateRange.js';
import { FieldText } from './FieldText.js';
import { DatePicker } from './DatePicker.js';
import { TimePicker } from './TimePicker.js';

/*
 * FieldWrapper renders `<label htmlFor={id}>` and cloneElement's `{id, aria-*}` onto its first child.
 * That only reaches the control if the control accepts those props -- and DatePickerProps,
 * TimePickerProps and DateRangePickerProps declared none of them, while each component destructures
 * only its known props. So the id went nowhere and the label pointed at an element that did not exist:
 * three shipped fields with a visible label and no accessible name.
 *
 * FieldText is the control case throughout. It forwards what it is given, and always passed.
 *
 * These are asserted through the Field* components rather than the pickers alone, because the defect
 * was in the seam between them: both halves looked correct on their own.
 */

const noop = () => {};

describe('a field label reaches its control', () => {
	it('FieldText, which always worked', () => {
		render(<FieldText label="Some text" value="" onChange={noop} />);
		expect(screen.getByLabelText('Some text')).toBeInTheDocument();
	});

	it('FieldDate', () => {
		render(<FieldDate label="Run on" value={null} onChange={noop} />);
		expect(screen.getByLabelText('Run on')).toBeInTheDocument();
	});

	it('FieldTime', () => {
		render(<FieldTime label="At" value={null} onChange={noop} />);
		expect(screen.getByLabelText('At')).toBeInTheDocument();
	});

	it('FieldDateRange', () => {
		render(<FieldDateRange label="Active period" value={{ from: null, to: null }} onChange={noop} />);
		expect(screen.getByLabelText('Active period')).toBeInTheDocument();
	});
});

// ---------------------------------------------------------------------------
// The pass-through itself
// ---------------------------------------------------------------------------

describe('the pickers forward the control props they are given', () => {
	it('DatePicker puts id and aria state on its input', () => {
		render(<DatePicker value={null} onChange={noop} id="d1" aria-invalid aria-describedby="d1-error" aria-required />);
		const input = screen.getByRole('textbox');
		expect(input).toHaveAttribute('id', 'd1');
		expect(input).toHaveAttribute('aria-invalid', 'true');
		expect(input).toHaveAttribute('aria-describedby', 'd1-error');
		expect(input).toHaveAttribute('aria-required', 'true');
	});

	it('TimePicker puts them on its trigger', () => {
		render(<TimePicker value={null} onChange={noop} id="t1" aria-invalid aria-describedby="t1-error" />);
		const trigger = screen.getByRole('button');
		expect(trigger).toHaveAttribute('id', 't1');
		expect(trigger).toHaveAttribute('aria-invalid', 'true');
		expect(trigger).toHaveAttribute('aria-describedby', 't1-error');
	});

	// Absent rather than empty: React omits an undefined attribute entirely, so a valid field is not
	// announced as "invalid, false".
	it('a picker given nothing renders no id and no aria state', () => {
		render(<DatePicker value={null} onChange={noop} />);
		const input = screen.getByRole('textbox');
		expect(input).not.toHaveAttribute('aria-invalid');
		expect(input).not.toHaveAttribute('aria-required');
	});
});

// ---------------------------------------------------------------------------
// error / required, which the wrapper already supported and the fields never forwarded
// ---------------------------------------------------------------------------

describe('a field can report a validation error', () => {
	// required and error were supported by FieldWrapper all along; the three date fields simply never
	// forwarded them, so a consumer could not get a red message out of a date field at all.
	it('FieldDate announces its error and marks the control invalid', () => {
		render(<FieldDate label="Run on" value={null} onChange={noop} error="Pick a date" />);
		expect(screen.getByRole('alert')).toHaveTextContent('Pick a date');
		const input = screen.getByLabelText('Run on');
		expect(input).toHaveAttribute('aria-invalid', 'true');
		expect(input).toHaveAttribute('aria-describedby', screen.getByRole('alert').id);
	});

	// The required marker is a visible asterisk appended to the label, so the accessible name gains
	// " *" -- hence the regex. aria-required on the control is what assistive tech actually reads.
	it('FieldTime marks a required field on the control, not only in the label', () => {
		render(<FieldTime label="At" value={null} onChange={noop} required />);
		expect(screen.getByLabelText(/^At/)).toHaveAttribute('aria-required', 'true');
	});
});
