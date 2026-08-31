import React from 'react';

import { ChipButton } from '../controls/ChipButton.js';
import { type ChipColor } from '../../utils/chipColors.js';

export interface FilterChipOption {
	value: string;
	label: string;
	color?: string;
}

export interface FilterChipsProps {
	bind: string;
	options: FilterChipOption[];
	value: string[];
	onChange: (values: string[]) => void;
}

/**
 * @registryCategory composite
 * @registryTags filter
 * @registryBind filters setFilter
 */
export function FilterChips({ options, value, onChange }: FilterChipsProps) {
	const allValues = options.map(o => o.value);
	const active = value.length > 0 ? value : allValues;

	function toggle(v: string) {
		if (active.includes(v) && active.length === 1) return;
		const next = active.includes(v) ? active.filter(x => x !== v) : [...active, v];
		onChange(next);
	}

	return (
		<div className="flex flex-wrap gap-2">
			{options.map(({ value: optValue, label, color }) => (
				<ChipButton
					key={optValue}
					active={active.includes(optValue)}
					color={color as ChipColor | undefined}
					onClick={() => toggle(optValue)}
				>
					{label}
				</ChipButton>
			))}
		</div>
	);
}
