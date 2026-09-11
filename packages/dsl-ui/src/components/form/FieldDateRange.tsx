import React from 'react';

import { DateRangePicker, type DateRange } from './DateRangePicker.js';
import { FieldWrapper } from './FieldWrapper.js';

export interface FieldDateRangeProps {
	label: string;
	description?: string;
	value: DateRange;
	onChange: (range: DateRange) => void;
	/** Function to determine if a date is disabled. Return true to disable. */
	isDisabled?: (date: Date) => boolean;
	minDate?: Date;
	maxDate?: Date;
	placeholder?: string;
	disabled?: boolean;
	dateFormat?: string;
}

/**
 * @registryCategory atomic
 * @registryTags field date range
 * @registryBind formData onChange
 */
export function FieldDateRange({
	label,
	description,
	value,
	onChange,
	isDisabled,
	minDate,
	maxDate,
	placeholder,
	disabled,
	dateFormat,
}: FieldDateRangeProps) {
	return (
		<FieldWrapper label={label} description={description}>
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
