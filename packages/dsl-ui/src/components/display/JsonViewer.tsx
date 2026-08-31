import React from 'react';

const containerClass =
	'rounded bg-muted-bg p-3 text-xs font-mono text-content overflow-x-auto whitespace-pre-wrap break-all';

export interface JsonViewerProps {
	row?: Record<string, unknown>;
	field?: string;
}

/**
 * @registryCategory atomic
 * @registryTags json viewer code
 */
export function JsonViewer({ row, field }: JsonViewerProps) {
	const json = field ? String(row?.[field] ?? '') : '';
	let formatted = json;
	try {
		formatted = JSON.stringify(JSON.parse(json), null, 2);
	} catch {
		// not valid JSON, show raw
	}
	return (
		<pre className={containerClass}>
			{formatted}
		</pre>
	);
}
