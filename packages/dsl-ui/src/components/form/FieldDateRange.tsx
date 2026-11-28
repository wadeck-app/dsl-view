import React from 'react';

import { DateRangePicker, type DateRange } from './DateRangePicker.js';
import { FieldWrapper } from './FieldWrapper.js';

export interface FieldDateRangeProps {
	label: string;
	description?: string;
	/** Small muted text under the field (a format, a hint). It describes the control (aria-describedby). `description` sits above the field. */
	helpText?: string;
	value: DateRange;
	onChange: (range: DateRange) => void;
	/** Function to determine if a date is disabled. Return true to disable. */
	isDisabled?: (date: Date) => boolean;
	minDate?: Date;
	maxDate?: Date;
	placeholder?: string;
	disabled?: boolean;
	dateFormat?: string;
	/** Marks the field required. Handled by FieldWrapper. */
	required?: boolean;
	/** Validation message. Handled by FieldWrapper. */
	error?: string;
}

/**
 * @registryCategory atomic
 * @registryTags field date range
 * @registryBind formData onChange
 */
export function FieldDateRange({
	label,
	description,
	helpText,
	value,
	onChange,
	isDisabled,
	minDate,
	maxDate,
	placeholder,
	disabled,
	dateFormat,
	required,
	error,
}: FieldDateRangeProps) {
	return (
		<FieldWrapper label={label} description={description} helpText={helpText} required={required} error={error}>
			<DateRangePicker
				value={value}
				onChange={onChange}
				isDisabled={isDisabled}
				minDate={minDate}
				maxDate={maxDate}
				placeholder={placeholder}
				disabled={disabled}
				dateFormat={dateFormat}
			/>
		</FieldWrapper>
	);
}
