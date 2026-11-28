import React from 'react';

import { TimePicker } from './TimePicker.js';
import { FieldWrapper } from './FieldWrapper.js';

export interface FieldTimeProps {
	label: string;
	description?: string;
	/** Small muted text under the field (a format, a hint). It describes the control (aria-describedby). `description` sits above the field. */
	helpText?: string;
	value: string | null;
	onChange: (value: string | null) => void;
	is12Hour?: boolean;
	/** Increment step for minutes (default 1) */
	minuteStep?: number;
	placeholder?: string;
	disabled?: boolean;
	/** Marks the field required. Handled by FieldWrapper. */
	required?: boolean;
	/** Validation message. Handled by FieldWrapper. */
	error?: string;
}

/**
 * @registryCategory atomic
 * @registryTags field time
 * @registryBind formData onChange
 */
export function FieldTime({
	label,
	description,
	helpText,
	value,
	onChange,
	is12Hour,
	minuteStep,
	placeholder,
	disabled,
	required,
	error,
}: FieldTimeProps) {
	return (
		<FieldWrapper label={label} description={description} helpText={helpText} required={required} error={error}>
			<TimePicker
				value={value}
				onChange={onChange}
				is12Hour={is12Hour}
				minuteStep={minuteStep}
				placeholder={placeholder}
				disabled={disabled}
			/>
		</FieldWrapper>
	);
}
