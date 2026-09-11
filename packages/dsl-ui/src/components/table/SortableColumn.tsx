import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import React from 'react';

export interface SortState {
	key: string;
	dir: 'asc' | 'desc';
}

export interface SortableColumnProps {
	label: string;
	sortKey: string;
	currentSort: SortState | null;
	onSort: (key: string) => void;
}

/**
 * @registryCategory atomic
 * @registryTags table sort column header
 */
export function SortableColumn({ label, sortKey, currentSort, onSort }: SortableColumnProps) {
	const isActive = currentSort?.key === sortKey;
	const dir = isActive ? currentSort!.dir : null;

	// @formatter:off
	let ariaSortValue: 'ascending' | 'descending' | 'none';
	if (!isActive) {
		ariaSortValue = 'none';
	} else if (dir === 'asc') {
		ariaSortValue = 'ascending';
	} else {
		ariaSortValue = 'descending';
	}
	// @formatter:on

	const Icon = !isActive ? ChevronsUpDown : dir === 'asc' ? ChevronUp : ChevronDown;

	return (
		<th
			aria-sort={ariaSortValue}
			className="px-3 py-2 font-normal whitespace-nowrap"
		>
			<button
				type="button"
				onClick={() => onSort(sortKey)}
				className={[
					'inline-flex items-center gap-1 select-none',
					'text-xs text-muted hover:text-content transition-colors',
					isActive ? 'text-content' : '',
				]
					.filter(Boolean)
					.join(' ')}
			>
				{label}
				<Icon
					className={['h-3 w-3', !isActive ? 'opacity-30' : ''].filter(Boolean).join(' ')}
					aria-hidden="true"
				/>
			</button>
		</th>
	);
}
