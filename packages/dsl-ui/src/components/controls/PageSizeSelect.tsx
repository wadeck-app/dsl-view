import React from 'react';

import { useOptionalUrlParam } from '../../context/UrlParamContext.js';

const selectClass =
	'rounded border border-border bg-surface px-2 py-1 text-sm text-content cursor-pointer';

export interface PageSizeSelectProps {
	/**
	 * URL search param name backing the selected size, e.g. "size". When set, PageSizeSelect
	 * reads/writes it directly via UrlParamContext (see useOptionalUrlParam) and `value`/
	 * `onChange` are ignored.
	 */
	urlParam?: string;
	/** Ignored when `urlParam` is set. */
	value?: number;
	options: number[];
	/** Ignored when `urlParam` is set. */
	onChange?: (n: number) => void;
}

/**
 * @registryCategory atomic
 * @registryTags pagination select
 */
export function PageSizeSelect({ urlParam, value, options, onChange }: PageSizeSelectProps) {
	const [urlSize, setUrlSize] = useOptionalUrlParam(urlParam);
	const activeValue = urlParam ? Number(urlSize) || options[0] : value ?? options[0];
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
