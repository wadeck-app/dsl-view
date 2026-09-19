import React, { useState } from 'react';

import { DatePicker } from './DatePicker.js';
import { TimePicker } from './TimePicker.js';
import { FieldWrapper } from './FieldWrapper.js';

export interface FieldDateTimeProps {
	label: string;
	description?: string;
	/** The moment, or null when it is not set. Both halves are derived from it. */
	value: Date | null;
	onChange: (value: Date | null) => void;
	/** Function to determine if a date is disabled. Return true to disable. */
	isDateDisabled?: (date: Date) => boolean;
	minDate?: Date;
	maxDate?: Date;
	datePlaceholder?: string;
	timePlaceholder?: string;
	disabled?: boolean;
	dateFormat?: string;
	is12Hour?: boolean;
	/** Increment step for minutes (default 1) */
	minuteStep?: number;
	/** Marks the field required. Handled by FieldWrapper. */
	required?: boolean;
	/** Validation message. Handled by FieldWrapper. */
	error?: string;
	/** Controlled open state of the time half (for testing and external control) */
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

/** "HH:mm", the shape TimePicker takes and returns. */
function timeOf(value: Date | null): string | null {
	if (!value) {
		return null;
	}
	return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

function parseTime(time: string): { hours: number; minutes: number } | null {
	const match = /^(\d{1,2}):(\d{2})$/.exec(time);
	if (!match) {
		return null;
	}
	const hours = parseInt(match[1]!, 10);
	const minutes = parseInt(match[2]!, 10);
	if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
		return null;
	}
	return { hours, minutes };
}

/** A date and a time combined, keeping the day from one and the hour from the other. */
function combine(day: Date, time: string | null): Date {
	const parsed = time ? parseTime(time) : null;
	const out = new Date(day);
	// Midnight only when no time is known. A date with no time is a real intent -- "that day" -- and
	// inventing the current hour would make the stored moment depend on when the form was filled in.
	out.setHours(parsed?.hours ?? 0, parsed?.minutes ?? 0, 0, 0);
	return out;
}

/**
 * One moment, chosen as a date and a time.
 *
 * FieldDate and FieldTime each hand one value to one picker; this holds a single Date and has to split
 * it and put it back together, which is where all the behaviour lives:
 *
 * - Editing the date keeps the time already chosen. Rebuilding from the calendar alone silently reset
 *   the hour to midnight, so correcting a typo in the day threw away the time.
 * - A time chosen before any date is HELD, not applied and not discarded. It cannot be placed on a
 *   calendar yet, and defaulting to today would quietly produce a moment in the past for anyone
 *   filling the form in the evening; discarding it would make the user enter it twice. It is applied
 *   as soon as a date arrives.
 *
 * The label belongs to the date half: FieldWrapper names one control, and the date is the one a reader
 * fills first. Passed through the render-prop form rather than as a plain child, because the first
 * child here is the flex row -- cloning that would put the id on a div and leave both controls
 * unnamed. See FieldWrapper.
 *
 * @registryCategory atomic
 * @registryTags field date time datetime
 * @registryBind formData onChange
 */
export function FieldDateTime({
	label,
	description,
	value,
	onChange,
	isDateDisabled,
	minDate,
	maxDate,
	datePlaceholder,
	timePlaceholder,
	disabled,
	dateFormat,
	is12Hour,
	minuteStep,
	required,
	error,
	open,
	onOpenChange,
}: FieldDateTimeProps) {
	// The time the user has chosen while there is still no date to attach it to. Null once a value
	// exists, since the value itself then carries the time.
	const [pendingTime, setPendingTime] = useState<string | null>(null);
	const time = value ? timeOf(value) : pendingTime;

	function handleDateChange(day: Date | null) {
		if (!day) {
			// Clearing the date clears the moment. The time is kept as pending so re-picking a day does
			// not ask for it again.
			setPendingTime(time);
			onChange(null);
			return;
		}
		onChange(combine(day, time));
		setPendingTime(null);
	}

	function handleTimeChange(next: string | null) {
		if (!value) {
			setPendingTime(next);
			return;
		}
		onChange(combine(value, next));
	}

	return (
		<FieldWrapper label={label} description={description} required={required} error={error}>
			{control => (
				<div className="flex items-start gap-2 mt-1">
					<div className="flex-1">
						<DatePicker
							value={value}
							onChange={handleDateChange}
							isDateDisabled={isDateDisabled}
							minDate={minDate}
							maxDate={maxDate}
							placeholder={datePlaceholder}
							disabled={disabled}
							dateFormat={dateFormat}
							{...control}
						/>
					</div>
					<div className="w-36 shrink-0">
						<TimePicker
							value={time}
							onChange={handleTimeChange}
							is12Hour={is12Hour}
							minuteStep={minuteStep}
							placeholder={timePlaceholder}
							disabled={disabled}
							open={open}
							onOpenChange={onOpenChange}
						/>
					</div>
				</div>
			)}
		</FieldWrapper>
	);
}
