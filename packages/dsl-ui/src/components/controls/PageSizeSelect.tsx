import React, { useMemo } from 'react';

import { useOptionalUrlParam } from '@dsl-ui/context/UrlParamContext.js';
import { reportOnce } from '@dsl-ui/components/dev/reportOnce.js';

const selectClass =
	'rounded border border-border bg-surface px-2 py-1 text-sm text-content cursor-pointer';

export interface PageSizeSelectProps {
	/**
	 * URL search param name backing the selected size, e.g. "size". When set, PageSizeSelect
	 * reads/writes it directly via UrlParamContext (see useOptionalUrlParam) and `value`/
	 * `onChange` are ignored.
	 */
	urlParam?: string;
	/**
	 * Other URL search params deleted in the same URL update when the size changes, typically
	 * ["page"]: a new page size shifts the page boundaries, so the old page number points at the
	 * wrong rows or past the end. Not applied by default (existing pages keep their behaviour).
	 * Requires `urlParam`.
	 */
	resetUrlParams?: string[];
	/** Ignored when `urlParam` is set. */
	value?: number;
	options: number[];
	/**
	 * Size selected when nothing says otherwise: the first option is used without it. With `urlParam`, an absent
	 * URL param is filled with this size (one replace on mount), so a source reading `$urlParam.<name>` sees what
	 * the select shows. Must be one of `options`; anything else is reported and ignored.
	 */
	default?: number;
	/** Ignored when `urlParam` is set. */
	onChange?: (n: number) => void;
}

/**
 * @registryCategory atomic
 * @registryTags pagination select
 */
export function PageSizeSelect({ urlParam, resetUrlParams, value, options: optionsProp, onChange, default: defaultProp }: PageSizeSelectProps) {
	// A size is a number: anything else in the list (`[{}]`, text, NaN) cannot be rendered or selected and is left out.
	// Memoised on the list itself so the effect below, which depends on its content, is not re-run by a fresh array.
	const options = useMemo(() => usableSizes(optionsProp), [optionsProp]);
	const [urlSize, setUrlSize] = useOptionalUrlParam(urlParam, { resetUrlParams });
	const defaultSize = defaultProp !== undefined && options.includes(defaultProp) ? defaultProp : undefined;
	if (defaultProp !== undefined && defaultSize === undefined) {
		reportOnce(`[PageSizeSelect] default ${String(defaultProp)} is not one of the offered sizes (${options.join(', ')}) and is ignored.`);
	}
	// A page size in the URL is what the sources read: fill an absent one with the default instead of only showing it.
	const missingInUrl = urlParam != null && urlSize === null;
	React.useEffect(() => {
		if (missingInUrl && defaultSize !== undefined) {
			setUrlSize(String(defaultSize));
		}
		// Once per missing value: setUrlSize is rebuilt with the router and must not re-run the seeding.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [missingInUrl, defaultSize]);
	// A size in the URL that is not offered (hand-edited link, changed options) is still what the page's sources read,
	// while the select can only show one of its options: say so instead of silently displaying the first one.
	const unlistedUrlSize = urlParam != null && urlSize != null && !options.includes(Number(urlSize));
	React.useEffect(() => {
		if (unlistedUrlSize) {
			console.warn(`[PageSizeSelect] ?${urlParam}=${urlSize} is not one of the offered sizes (${options.join(', ')}), so the select has no matching option while the page still uses ${urlSize}.`);
		}
		// options is compared by content through its joined form so a fresh array each render does not re-warn.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [unlistedUrlSize, urlParam, urlSize, options.join(',')]);
	const activeValue = urlParam ? Number(urlSize) || defaultSize || options[0] : value ?? defaultSize ?? options[0];
	const changeValue = urlParam ? (n: number) => setUrlSize(String(n)) : onChange;

	return (
		// violations-suppress: react/no-raw-input PageSizeSelect IS an atomic wrapper for the pagination select interaction
		<select
			value={activeValue}
			onChange={e => changeValue?.(Number(e.target.value))}
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

// Numeric text (`"10"`, as a JSON source may give) is a size; objects, other text and non-finite numbers are not.
function usableSizes(options: readonly unknown[]): number[] {
	const sizes = options
		.map(option => (typeof option === 'string' && option.trim() !== '' ? Number(option) : option))
		.filter((option): option is number => typeof option === 'number' && Number.isFinite(option));
	if (sizes.length !== options.length) {
		reportOnce(`[PageSizeSelect] ${options.length - sizes.length} of ${options.length} option(s) are not numbers and are left out: write the page sizes as numbers, e.g. [10, 25, 50].`);
	}
	return sizes;
}
