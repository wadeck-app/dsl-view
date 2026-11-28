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
	/** Small muted text under the field (a format, a hint). It describes the control (aria-describedby). `description` sits above the field. */
	helpText?: string;
	value: string;
	onChange: (v: string) => void;
	readOnly?: boolean;
	/** Marks the field required. Handled by FieldWrapper. */
	required?: boolean;
	/** Validation message. Handled by FieldWrapper. */
	error?: string;
	/** A leading icon inside the field (a search glass, a unit). Decoration: the label stays the accessible name. */
	icon?: React.ReactNode;
	/** The input element, for a page that focuses it or measures it. React only. */
	ref?: React.Ref<HTMLInputElement>;
}

/**
 * @registryCategory atomic
 * @registryTags field
 * @registryBind formData onChange
 */
export function FieldText({ label, description, helpText, value, onChange, readOnly, required, error, className, hideLabel, size = 'md', icon, ...rest }: FieldTextProps) {
	const inputClass = `${hideLabel ? '' : 'mt-1 '}${inputBase} ${SIZE_CLASS[size] ?? SIZE_CLASS.md}${icon ? ' pl-9' : ''}`;
	const classes = `${inputClass}${className ? ` ${className}` : ''}`;
	// An id the caller gave is the control's id (the label points at it); the wrapper adds ARIA state without erasing the caller's.
	return (
		<FieldWrapper label={label} description={description} helpText={helpText} required={required} error={error} hideLabel={hideLabel} id={rest.id}>
			{control => {
				const given = Object.fromEntries(Object.entries(control).filter(([, value]) => value !== undefined));
				const aria = { ...rest, ...given, 'aria-describedby': [rest['aria-describedby'], control['aria-describedby']].filter(Boolean).join(' ') || undefined };
				const input = readOnly ? (
					<input readOnly value={value} className={classes} {...aria} />
				) : (
					<input type="text" value={value} onChange={e => onChange(e.target.value)} className={classes} {...aria} />
				);
				return icon ? (
					<div className="relative">
						<span aria-hidden="true" className={`pointer-events-none absolute left-3 flex items-center text-muted ${hideLabel ? 'inset-y-0' : 'bottom-0 top-1'}`}>
							{icon}
						</span>
						{input}
					</div>
				) : (
					input
				);
			}}
		</FieldWrapper>
	);
}
