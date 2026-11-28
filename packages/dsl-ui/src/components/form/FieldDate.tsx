import React from 'react';

import { DatePicker } from './DatePicker.js';
import { FieldWrapper } from './FieldWrapper.js';

export interface FieldDateProps {
	label: string;
	description?: string;
	/** Small muted text under the field (a format, a hint). It describes the control (aria-describedby). `description` sits above the field. */
	helpText?: string;
	value: Date | null;
	onChange: (date: Date | null) => void;
	/** Function to determine if a date is disabled. Return true to disable. */
	isDateDisabled?: (date: Date) => boolean;
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
 * @registryTags field date
 * @registryBind formData onChange
 */
export function FieldDate({
	label,
	description,
	helpText,
	value,
	onChange,
	isDateDisabled,
	minDate,
	maxDate,
	placeholder,
	disabled,
	dateFormat,
	required,
	error,
}: FieldDateProps) {
	return (
		<FieldWrapper label={label} description={description} helpText={helpText} required={required} error={error}>
			<DatePicker
				value={value}
				onChange={onChange}
				isDateDisabled={isDateDisabled}
				minDate={minDate}
				maxDate={maxDate}
				placeholder={placeholder}
				disabled={disabled}
				dateFormat={dateFormat}
			/>
		</FieldWrapper>
	);
}
