import React from 'react';
import { ChevronDown } from 'lucide-react';

import { FieldWrapper } from './FieldWrapper.js';

// pr-9 reserves the chevron's column. A native select draws its own arrow inside the box,
// so symmetric px-3 left the glyph flush against the border; the arrow is suppressed with
// appearance-none and drawn here instead, inset like every other trailing affordance.
// @formatter:off
const selectClass  = 'mt-1 block w-full appearance-none rounded border border-border bg-surface text-content pl-3 pr-9 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer';
const chevronClass = 'pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted';
// @formatter:on

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
	/** Marks the field required. Handled by FieldWrapper. */
	required?: boolean;
	/** Validation message. Handled by FieldWrapper. */
	error?: string;
}

/**
 * @registryCategory atomic
 * @registryTags field select
 * @registryBind formData onChange
 */
export function FieldSelect({ label, description, value, onChange, options, placeholder, required, error }: FieldSelectProps) {
	return (
		// Function form: the control is nested inside the positioning wrapper the chevron
		// needs, so FieldWrapper cannot reach it by cloning its first child.
		<FieldWrapper label={label} description={description} required={required} error={error}>
			{control => (
				<div className="relative">
					<select
						value={value}
						onChange={e => onChange(e.target.value)}
						className={selectClass}
						{...control}
					>
						{placeholder && <option value="">{placeholder}</option>}
						{options.map(opt => (
							<option key={opt.value} value={opt.value}>
								{opt.label}
							</option>
						))}
					</select>
					<ChevronDown className={chevronClass} aria-hidden="true" />
				</div>
			)}
		</FieldWrapper>
	);
}
