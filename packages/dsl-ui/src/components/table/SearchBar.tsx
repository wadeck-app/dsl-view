import { Search, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { useOptionalUrlParam } from '@dsl-ui/context/UrlParamContext.js';
import { warnUnknownChoice } from '@dsl-ui/utils/warnUnknownChoice.js';
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
	/**
	 * URL search param name backing the text, e.g. "q". When set, SearchBar reads/writes it via
	 * UrlParamContext (see useOptionalUrlParam) and `value`/`onChange` are ignored, so a page can
	 * filter a $sources entry with `$urlParam.q` without any wiring. Requires RouterProvider.
	 */
	urlParam?: string;
	/**
	 * Other URL search params deleted in the same URL update when the text changes, typically
	 * ["page"] so narrowing a filter does not leave a stale page number behind. Requires `urlParam`.
	 */
	resetUrlParams?: string[];
	/** Required unless `urlParam` is set. */
	value?: string;
	/** Required unless `urlParam` is set. */
	onChange?: (value: string) => void;
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
export function SearchBar({ urlParam, resetUrlParams, value: valueProp, onChange: onChangeProp, placeholder, debounceMs = 300, focusExpand = false, size = 'md' }: SearchBarProps) {
	const [urlValue, setUrlValue] = useOptionalUrlParam(urlParam, { resetUrlParams });
	if (urlParam == null && (valueProp === undefined || onChangeProp === undefined)) {
		throw new Error('[SearchBar] needs either "urlParam" or both "value" and "onChange"');
	}
	const value = urlParam != null ? urlValue ?? '' : valueProp ?? '';
	const onChange = urlParam != null ? setUrlValue : onChangeProp!;
	const [localValue, setLocalValue] = useState(value);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	// An unknown size (`size: large`, an empty value) has no classes: use the default and say which are allowed.
	warnUnknownChoice('SearchBar', 'size', size, SIZE_CLASSES);
	const sizeClasses = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;
	const searchIconClass = `pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted ${sizeClasses.icon}`;
	const searchInputClass = `w-full appearance-none rounded border border-border bg-surface text-content placeholder-muted focus:outline-none focus:ring-1 focus:ring-border ${sizeClasses.input}`;

	// Sync external value changes (e.g. clear from parent)
	useEffect(() => {
		setLocalValue(value);
	}, [value]);

	// A debounced change still pending when the bar unmounts (navigation) must not fire: with a urlParam it would
	// write the stale text into the URL of the page the user just moved to.
	useEffect(() => {
		return () => {
			if (timerRef.current !== null) {
				clearTimeout(timerRef.current);
			}
		};
	}, []);

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
				aria-label={placeholder || 'Search'}
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
