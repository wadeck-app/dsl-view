import React from 'react';

import { Button } from '../controls/_Button.js';

const DEFAULT_OPTIONS = ['all', '2xx', '3xx', '4xx', '5xx'];

export interface StatusFilterProps {
	field?: string;
	value: string;
	onChange: (v: string) => void;
	options?: Array<string | { value: string; label: string }>;
}

/**
 * @registryCategory atomic
 * @registryTags filter
 * @registryBind filters setFilter
 *
 * IN SCOPE: radio-style single-select filter buttons. Default options are HTTP status families.
 * Custom options can be passed via the `options` prop for other use cases (e.g. event type filter).
 */
export function StatusFilter({ value, onChange, options: customOptions }: StatusFilterProps) {
	const rawOptions = customOptions ?? DEFAULT_OPTIONS;
	const options = rawOptions.map(o => (typeof o === 'string' ? { value: o, label: o === 'all' ? 'All' : o } : o));
	const active = value || 'all';

	return (
		<div className="flex flex-wrap gap-1.5">
			{options.map(({ value: optValue, label }) => (
				<Button
					key={optValue}
					variant="ghost"
					size="sm"
					onClick={() => onChange(optValue)}
					aria-pressed={active === optValue}
					className={[
						'rounded border px-2 py-0.5',
						active === optValue
							? 'border-border bg-muted-bg text-content'
							: 'border-border bg-surface text-muted hover:text-content',
					].join(' ')}
				>
					{label}
				</Button>
			))}
		</div>
	);
}
