import React from 'react';

import { X } from 'lucide-react';

import { type ChipColor } from '@dsl-ui/utils/chipColors.js';
import { Button } from '../controls/_Button.js';
import { ChipButton } from '../controls/ChipButton.js';
import { SearchBar } from './SearchBar.js';

export interface FilterBarFilter {
	key: string;
	label: string;
	value: string;
	active: boolean;
	color?: string;
}

export interface FilterBarProps {
	search?: string;
	onSearchChange?: (v: string) => void;
	filters?: FilterBarFilter[];
	onFilterChange?: (key: string, value: string, active: boolean) => void;
	onClearAll?: () => void;
	placeholder?: string;
	className?: string;
}

/**
 * @registryCategory composite
 * @registryTags filter search bar
 */
export function FilterBar({
	search,
	onSearchChange,
	filters,
	onFilterChange,
	onClearAll,
	placeholder,
	className = '',
}: FilterBarProps) {
	const showSearch = onSearchChange !== undefined;
	const hasActiveFilter = filters?.some(f => f.active) ?? false;
	const hasActiveSearch = search !== undefined && search.length > 0;
	const showClearAll = hasActiveFilter || hasActiveSearch;

	return (
		<div className={['flex flex-row items-center gap-2 flex-wrap', className].filter(Boolean).join(' ')}>
			{showSearch && (
				<SearchBar
					value={search ?? ''}
					onChange={onSearchChange}
					placeholder={placeholder}
				/>
			)}

			{filters && filters.length > 0 && (
				<div className="flex flex-row items-center gap-1 flex-wrap">
					{filters.map(f => (
						<ChipButton
							key={f.key}
							active={f.active}
							color={f.color as ChipColor | undefined}
							onClick={() => onFilterChange?.(f.key, f.value, !f.active)}
						>
							{f.label}
						</ChipButton>
					))}
				</div>
			)}

			{showClearAll && (
				<Button variant="ghost" size="sm" onClick={onClearAll}>
					<X className="h-3.5 w-3.5" aria-hidden="true" />
					Clear all
				</Button>
			)}
		</div>
	);
}
