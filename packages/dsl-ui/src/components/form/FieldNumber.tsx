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
	unlimited,
	unlimitedValue = false,
	onUnlimitedChange,
}: FieldNumberProps) {
	return (
		<FieldWrapper label={label} description={description}>
			<div className="flex items-center gap-3 mt-1">
				<input
					type="number"
					min={min}
					max={max}
					value={String(value)}
					disabled={disabled ?? unlimitedValue}
					onChange={e => onChange(e.target.value)}
					className={narrowInputClass}
				/>
				{suffix && <span className="text-sm text-muted">{suffix}</span>}
				{unlimited && (
					// violations-suppress: no-raw-html-in-component FieldNumber IS an HTML form primitive
					<label className="flex items-center gap-1 text-sm text-muted">
						<input
							type="checkbox"
							checked={unlimitedValue}
							onChange={e => {
								onUnlimitedChange?.(e.target.checked);
								if (e.target.checked) onChange('');
							}}
							className="h-4 w-4"
						/>
						Unlimited
					</label>
				)}
			</div>
		</FieldWrapper>
	);
}
