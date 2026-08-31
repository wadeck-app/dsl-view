import React from 'react';
import { FieldWrapper } from './FieldWrapper.js';

const selectClass =
	'mt-1 block w-full rounded border border-border bg-surface text-content px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer';

export interface FieldSelectOption {
	value: string;
	label: string;
}

export interface FieldSelectProps {
	label: string;
	description?: string;
	value: string;
	onChange: (v: string) => void;
	options: FieldSelectOption[];
	placeholder?: string;
}

/**
 * @registryCategory atomic
 * @registryTags field select
 * @registryBind formData onChange
 */
export function FieldSelect({ label, description, value, onChange, options, placeholder }: FieldSelectProps) {
	return (
		<FieldWrapper label={label} description={description}>
			<select
				value={value}
				onChange={e => onChange(e.target.value)}
				className={selectClass}
			>
				{placeholder && <option value="">{placeholder}</option>}
				{options.map(opt => (
					<option key={opt.value} value={opt.value}>
						{opt.label}
					</option>
				))}
			</select>
		</FieldWrapper>
	);
}
