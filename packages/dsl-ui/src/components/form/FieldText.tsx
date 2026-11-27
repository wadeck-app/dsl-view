import React from 'react';

import { FieldWrapper } from './FieldWrapper.js';

const inputBase =
	'block w-full rounded border border-border bg-surface text-content px-3 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';
// sm matches ButtonAction sm (26px): py-1 text-xs.
const SIZE_CLASS = { md: 'py-2 text-sm', sm: 'py-1 text-xs' } as const;

export interface FieldTextProps
	extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'size'> {
	label: string;
	/** Hides the label visually (it stays the accessible name): for inline filters and fields in a row. */
	hideLabel?: boolean;
	/** `md` (default, 38px) or `sm` (26px, as ButtonAction sm). */
	size?: 'md' | 'sm';
	description?: string;
	value: string;
	onChange: (v: string) => void;
	readOnly?: boolean;
	/** Marks the field required. Handled by FieldWrapper. */
	required?: boolean;
	/** Validation message. Handled by FieldWrapper. */
	error?: string;
}

/**
 * @registryCategory atomic
 * @registryTags field
 * @registryBind formData onChange
 */
export function FieldText({ label, description, value, onChange, readOnly, required, error, className, hideLabel, size = 'md', ...rest }: FieldTextProps) {
	const inputClass = `${hideLabel ? '' : 'mt-1 '}${inputBase} ${SIZE_CLASS[size] ?? SIZE_CLASS.md}`;
	return (
		<FieldWrapper label={label} description={description} required={required} error={error} hideLabel={hideLabel}>
			{readOnly ? (
				<input
					readOnly
					value={value}
					className={`${inputClass}${className ? ` ${className}` : ''}`}
					{...rest}
				/>
			) : (
				<input
					type="text"
					value={value}
					onChange={e => onChange(e.target.value)}
					className={`${inputClass}${className ? ` ${className}` : ''}`}
					{...rest}
				/>
			)}
		</FieldWrapper>
	);
}
