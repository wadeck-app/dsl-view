import React from 'react';
import { ChevronDown } from 'lucide-react';

import { FieldWrapper } from './FieldWrapper.js';

// pr-9 reserves the chevron's column. A native select draws its own arrow inside the box,
// so symmetric px-3 left the glyph flush against the border; the arrow is suppressed with
// appearance-none and drawn here instead, inset like every other trailing affordance.
// @formatter:off
const selectBase   = 'block w-full appearance-none rounded border border-border bg-surface text-content pl-3 pr-9 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const chevronClass = 'pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted';
// sm matches ButtonAction sm (26px): py-1 text-xs.
const SIZE_CLASS = { md: 'py-2 text-sm', sm: 'py-1 text-xs' } as const;
// @formatter:on

export interface FieldSelectOption {
	value: string;
	label: string;
}

export interface FieldSelectProps {
	label: string;
	description?: string;
	/** Small muted text under the field (a format, a hint). It describes the control (aria-describedby). `description` sits above the field. */
	helpText?: string;
	value: string;
	onChange: (v: string) => void;
	options: FieldSelectOption[];
	placeholder?: string;
	disabled?: boolean;
	/** Marks the field required. Handled by FieldWrapper. */
	required?: boolean;
	/** Validation message. Handled by FieldWrapper. */
	error?: string;
	/** Hides the label visually (it stays the accessible name): for inline filters and fields in a row. */
	hideLabel?: boolean;
	/** `md` (default, 38px) or `sm` (26px, as ButtonAction sm). */
	size?: 'md' | 'sm';
}

// Reported once per received type, not once per render.
const reportedBadOptions = new Set<string>();

/**
 * @registryCategory atomic
 * @registryTags field select
 * @registryBind formData onChange
 */
export function FieldSelect({ label, description, helpText, value, onChange, options: optionsProp, placeholder, disabled, required, error, hideLabel, size = 'md' }: FieldSelectProps) {
	// `options: $sources.authors` is undefined until the source has loaded: show an empty list meanwhile instead of
	// crashing the page on `.map`. Anything else that is not a list is an authoring mistake and is reported once.
	const received: unknown = optionsProp;
	if (received !== undefined && received !== null && !Array.isArray(received) && !reportedBadOptions.has(typeof received)) {
		reportedBadOptions.add(typeof received);
		console.error(`[FieldSelect] "${label}": options must be a list of { value, label }, got ${typeof received}; showing no options.`);
	}
	const options: FieldSelectOption[] = Array.isArray(received) ? (received as FieldSelectOption[]) : [];
	return (
		// Function form: the control is nested inside the positioning wrapper the chevron
		// needs, so FieldWrapper cannot reach it by cloning its first child.
		<FieldWrapper label={label} description={description} helpText={helpText} required={required} error={error} hideLabel={hideLabel}>
			{control => (
				<div className="relative">
					<select
						value={value}
						onChange={e => onChange(e.target.value)}
						disabled={disabled}
						className={`${hideLabel ? '' : 'mt-1 '}${selectBase} ${SIZE_CLASS[size] ?? SIZE_CLASS.md}`}
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
