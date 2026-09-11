import React from 'react';
import * as RadixRadioGroup from '@radix-ui/react-radio-group';

export interface RadioOption {
	value: string;
	label: string;
	disabled?: boolean;
}

export interface RadioGroupProps {
	options: RadioOption[];
	value: string;
	onChange: (value: string) => void;
	label?: string;
	orientation?: 'vertical' | 'horizontal';
}

const ITEM_BASE_CLASS =
	'appearance-none h-4 w-4 rounded-full border-2 bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-solid)] focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center flex-shrink-0 cursor-pointer';

const INDICATOR_DOT_CLASS = 'h-2.5 w-2.5 rounded-full bg-[var(--color-primary-solid)]';

const LEGEND_CLASS = 'text-sm font-medium text-content mb-2';

const LABEL_ENABLED_CLASS = 'flex items-center gap-2 text-sm text-content cursor-pointer';
const LABEL_DISABLED_CLASS = 'flex items-center gap-2 text-sm text-content opacity-50 cursor-not-allowed';

const ORIENTATION_CLASS: Record<NonNullable<RadioGroupProps['orientation']>, string> = {
	vertical:   'flex flex-col gap-2',
	horizontal: 'flex flex-row flex-wrap gap-4',
};

/**
 * @registryCategory atomic
 * @registryTags radio group field
 * @registryBind formData onChange
 */
export function RadioGroup({
	options,
	value,
	onChange,
	label,
	orientation = 'vertical',
}: RadioGroupProps) {
	return (
		<fieldset className="border-0 p-0 m-0">
			{label && <legend className={LEGEND_CLASS}>{label}</legend>}
			<RadixRadioGroup.Root value={value} onValueChange={onChange} orientation={orientation}>
				<div className={ORIENTATION_CLASS[orientation]}>
					{options.map((opt) => (
						<label
							key={opt.value}
							className={opt.disabled ? LABEL_DISABLED_CLASS : LABEL_ENABLED_CLASS}
						>
							<RadixRadioGroup.Item
								value={opt.value}
								disabled={opt.disabled}
								className={`${ITEM_BASE_CLASS} ${value === opt.value ? 'border-[var(--color-primary-solid)]' : 'border-border'}`}
							>
								<RadixRadioGroup.Indicator>
									<span className={INDICATOR_DOT_CLASS} />
								</RadixRadioGroup.Indicator>
							</RadixRadioGroup.Item>
							<span>{opt.label}</span>
						</label>
					))}
				</div>
			</RadixRadioGroup.Root>
		</fieldset>
	);
}
