import React from 'react';

const selectClass =
	'rounded border border-border bg-surface px-2 py-1 text-sm text-content cursor-pointer';

export interface PageSizeSelectProps {
	value: number;
	options: number[];
	onChange: (n: number) => void;
}

/**
 * @registryCategory atomic
 * @registryTags pagination select
 */
export function PageSizeSelect({ value, options, onChange }: PageSizeSelectProps) {
	return (
		// violations-suppress: react/no-raw-input PageSizeSelect IS an atomic wrapper for the pagination select interaction
		<select
			value={value}
			onChange={e => onChange(Number(e.target.value))}
			className={selectClass}
			aria-label="Page size"
		>
			{options.map(opt => (
				<option key={opt} value={opt}>
					{opt} / page
				</option>
			))}
		</select>
	);
}
