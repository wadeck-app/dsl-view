import React, { useCallback, useContext } from 'react';
import { DatePicker, type DatePickerProps } from './DatePicker.js';
import { FieldWrapper } from './FieldWrapper.js';
import { FormContext } from './Form.js';

export interface FieldDateProps extends Omit<DatePickerProps, 'onChange'> {
	/** Form field name - used for binding to form context */
	name: string;
	/** Label displayed above the field */
	label: string;
	/** Optional description text below label */
	description?: string;
	/** Whether this field is required */
	required?: boolean;
	/** Error message to display */
	error?: string;
	/** Callback when value changes */
	onChange?: (date: Date | null) => void;
}

/**
 * @registryCategory atomic
 * @registryTags field date
 * @registryBind formData onChange
 */
export function FieldDate({
	name,
	label,
	description,
	required,
	error,
	value,
	onChange,
	...datePickerProps
}: FieldDateProps) {
	const formContext = useContext(FormContext);

	// Determine the current value: from prop or from form context
	const currentValue = value ?? (formContext?.formData?.[name] as Date | null) ?? null;

	// Handle changes: update both form context and optional onChange callback
	const handleChange = useCallback(
		(newDate: Date | null) => {
			if (formContext) {
				formContext.onChange(name, newDate);
			}
			onChange?.(newDate);
		},
		[formContext, name, onChange],
	);

	return (
		<FieldWrapper label={required ? `${label}*` : label} description={description}>
			<div>
				<DatePicker
					value={currentValue}
					onChange={handleChange}
					{...datePickerProps}
				/>
				{error && <p className="mt-1 text-xs text-danger-text">{error}</p>}
			</div>
		</FieldWrapper>
	);
}
