import React from 'react';

import { FieldWrapper } from './FieldWrapper.js';

const inputClass =
	'block w-full rounded border border-border bg-surface text-content px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

export interface FieldTextProps
	extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
	label: string;
	description?: string;
	value: string;
	onChange: (v: string) => void;
	readOnly?: boolean;
}

/**
 * @registryCategory atomic
 * @registryTags field
 * @registryBind formData onChange
 */
export function FieldText({ label, description, value, onChange, readOnly, className, ...rest }: FieldTextProps) {
	return (
		<FieldWrapper label={label} description={description}>
			{readOnly ? (
				<input
					readOnly
					value={value}
					className={`mt-1 ${inputClass}${className ? ` ${className}` : ''}`}
					{...rest}
				/>
			) : (
				<input
					type="text"
					value={value}
					onChange={e => onChange(e.target.value)}
					className={`mt-1 ${inputClass}${className ? ` ${className}` : ''}`}
					{...rest}
				/>
			)}
		</FieldWrapper>
	);
}
