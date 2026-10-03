import { Search, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { Button } from '../controls/_Button.js';

// @formatter:off
// 'sm' matches ChipButton's geometry (py-0.5 text-xs, 12px icon) for mixed toolbars.
// 'md' matches DateRangePicker's trigger height (py-1.5 + text-sm + border) for toolbars
// that mix a SearchBar with a DateRangePicker or other Field-level control.
const SIZE_CLASSES = {
	md: {
		icon: 'h-3.5 w-3.5',
		input: 'px-2 py-1.5 pl-7 text-sm',
	},
	sm: {
		icon: 'h-3 w-3',
		input: 'px-2 py-0.5 pl-6 text-xs',
	},
} as const;
const focusExpandClass = 'transition-all duration-200 focus:w-64';
// @formatter:on

export interface SearchBarProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	/** 0 = call onChange synchronously on every keystroke, no debounce. */
	debounceMs?: number;
	/** Grows the input from its base width to w-64 on focus, then shrinks back on blur. */
	focusExpand?: boolean;
	/** 'md' (default) is the original geometry. 'sm' matches a ChipButton for mixed toolbars. */
	size?: 'sm' | 'md';
}

/**
 * @registryCategory composite
 * @registryTags filter search
 */
export function SearchBar({ value, onChange, placeholder, debounceMs = 300, focusExpand = false, size = 'md' }: SearchBarProps) {
	const [localValue, setLocalValue] = useState(value);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const sizeClasses = SIZE_CLASSES[size];
	const searchIconClass = `pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted ${sizeClasses.icon}`;
	const searchInputClass = `w-full appearance-none rounded border border-border bg-surface text-content placeholder-muted focus:outline-none focus:ring-1 focus:ring-border ${sizeClasses.input}`;

	// Sync external value changes (e.g. clear from parent)
	useEffect(() => {
		setLocalValue(value);
	}, [value]);

	function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
		const next = e.target.value;
		setLocalValue(next);

		if (debounceMs <= 0) {
			onChange(next);
			return;
		}

		if (timerRef.current !== null) {
			clearTimeout(timerRef.current);
		}
		timerRef.current = setTimeout(() => {
			onChange(next);
		}, debounceMs);
	}

	function handleClear() {
		if (timerRef.current !== null) {
			clearTimeout(timerRef.current);
		}
		setLocalValue('');
		onChange('');
	}

	return (
		<div role="search" className={focusExpand ? 'relative flex items-center' : 'relative flex items-center w-52'}>
			<Search
				className={searchIconClass}
				aria-hidden="true"
			/>
			{/* violations-suppress: react/no-raw-input SearchBar IS the atomic search-input wrapper - this is intentional, mirrors Button.tsx */}
			<input
				type="search"
				aria-label={placeholder ?? 'Search'}
				placeholder={placeholder}
				value={localValue}
				onChange={handleChange}
				className={focusExpand ? `${searchInputClass.replace('w-full', 'w-48')} ${focusExpandClass}` : searchInputClass}
			/>
			{localValue.length > 0 && (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={handleClear}
					aria-label="Clear search"
					className="absolute right-2 h-5 w-5 p-0"
				>
					<X className="h-3.5 w-3.5" aria-hidden="true" />
				</Button>
			)}
		</div>
	);
}
