import React from 'react';

import { ChipButton } from '../controls/ChipButton.js';
import { type ChipColor } from '@dsl-ui/utils/chipColors.js';

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
	/**
	 * 'multi' (default) toggles chips independently, reads an empty value as "all
	 * options active", and refuses to clear the last one.
	 *
	 * 'single' keeps exactly one chip active and replaces the selection on click. Use it
	 * when the options are mutually exclusive and one of them is an explicit "All": an
	 * empty value then means nothing is selected, not everything.
	 */
	mode?: 'multi' | 'single';
}

/**
 * @registryCategory composite
 * @registryTags filter
 * @registryBind filters setFilter
 */
export function FilterChips({ options, value, onChange, mode = 'multi' }: FilterChipsProps) {
	const allValues = options.map(o => o.value);
	// The "empty means everything" default only makes sense for multi-select. Applying it
	// to a mutually exclusive set would light up every chip at once.
	const active = mode === 'single'
		? value
		: (value.length > 0 ? value : allValues);

	function toggle(v: string) {
		if (mode === 'single') {
			onChange([v]);
			return;
		}
		// Clearing the last active chip would filter everything out, so it is refused.
		if (active.includes(v) && active.length === 1) {
			return;
		}
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
