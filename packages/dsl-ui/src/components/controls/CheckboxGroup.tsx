import React from 'react';
import { Checkbox } from './Checkbox.js';

export interface CheckboxOption {
	value: string;
	label: string;
	disabled?: boolean;
}

export interface CheckboxGroupProps {
	options: CheckboxOption[];
	value: string[];
	onChange: (value: string[]) => void;
	label?: string;
	orientation?: 'vertical' | 'horizontal';
}

const LEGEND_CLASS = 'text-sm font-medium text-content mb-2';

const LABEL_ENABLED_CLASS = 'flex items-center gap-2 text-sm text-content cursor-pointer';
const LABEL_DISABLED_CLASS = 'flex items-center gap-2 text-sm text-content opacity-50 cursor-not-allowed';

const ORIENTATION_CLASS: Record<NonNullable<CheckboxGroupProps['orientation']>, string> = {
	vertical:   'flex flex-col gap-2',
	horizontal: 'flex flex-row flex-wrap gap-4',
};

/**
 * @registryCategory atomic
 * @registryTags checkbox group field
 * @registryBind formData onChange
 */
export function CheckboxGroup({
	options,
	value,
	onChange,
	label,
	orientation = 'vertical',
}: CheckboxGroupProps) {
	function toggle(optValue: string) {
		if (value.includes(optValue)) {
			onChange(value.filter((v) => v !== optValue));
		} else {
			onChange([...value, optValue]);
		}
	}

	return (
		<fieldset className="border-0 p-0 m-0">
			{label && <legend className={LEGEND_CLASS}>{label}</legend>}
			<div className={ORIENTATION_CLASS[orientation]}>
				{options.map((opt) => (
					<label
						key={opt.value}
						className={opt.disabled ? LABEL_DISABLED_CLASS : LABEL_ENABLED_CLASS}
					>
						<Checkbox
							checked={value.includes(opt.value)}
							onChange={() => !opt.disabled && toggle(opt.value)}
							disabled={opt.disabled}
							className="!h-4 !w-4"
						/>
						{opt.label}
					</label>
				))}
			</div>
		</fieldset>
	);
}
