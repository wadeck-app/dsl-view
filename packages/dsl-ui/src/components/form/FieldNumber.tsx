import React from 'react';

import { FieldWrapper } from './FieldWrapper.js';

const narrowInputClass =
	'block w-32 rounded border border-border bg-surface text-content px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-muted-bg disabled:text-muted';

export interface FieldNumberProps {
	label: string;
	description?: string;
	value: string | number;
	onChange: (v: string | number) => void;
	min?: number;
	max?: number;
	suffix?: string;
	disabled?: boolean;
	/** Marks the field required. Handled by FieldWrapper. */
	required?: boolean;
	/** Validation message. Handled by FieldWrapper. */
	error?: string;
	// DSL wiring: ctx key whose boolean value drives the unlimited checkbox
	unlimited?: string;
	unlimitedValue?: boolean;
	onUnlimitedChange?: (v: boolean) => void;
}

/**
 * @registryCategory atomic
 * @registryTags field
 * @registryBind formData onChange
 */
export function FieldNumber({
	label,
	description,
	value,
	onChange,
	min,
	max,
	suffix,
	disabled,
	required,
	error,
	unlimited,
	unlimitedValue = false,
	onUnlimitedChange,
}: FieldNumberProps) {
	return (
		// Function form, not a plain child: the first child here is the flex row, so letting
		// FieldWrapper clone it would put the label id and ARIA state on a div and leave the
		// input with no accessible name.
		<FieldWrapper label={label} description={description} required={required} error={error}>
			{control => (
			<div className="flex items-center gap-3 mt-1">
				<input
					type="number"
					min={min}
					max={max}
					value={String(value)}
					disabled={disabled ?? unlimitedValue}
					onChange={e => onChange(e.target.value)}
					className={narrowInputClass}
					{...control}
				/>
				{suffix && <span className="text-sm text-muted">{suffix}</span>}
				{unlimited && (
					<label className="flex items-center gap-1 text-sm text-muted">
						<input
							type="checkbox"
							checked={unlimitedValue}
							onChange={e => {
								onUnlimitedChange?.(e.target.checked);
								if (e.target.checked) {
										// Clear the number so "unlimited" leaves no stale bound behind.
										onChange('');
									}
							}}
							className="h-4 w-4"
						/>
						Unlimited
					</label>
				)}
			</div>
			)}
		</FieldWrapper>
	);
}
