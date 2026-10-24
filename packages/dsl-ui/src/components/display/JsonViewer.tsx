import React from 'react';

const containerClass =
	'rounded bg-muted-bg p-3 text-xs font-mono text-content overflow-x-auto whitespace-pre-wrap break-all';

export interface JsonViewerProps {
	row?: Record<string, unknown>;
	field?: string;
	/** Caps the viewer's height with internal scroll (CSS value, e.g. "20rem", "400px"). Unset = unbounded, grows with content. */
	maxHeight?: string;
}

/**
 * @registryCategory atomic
 * @registryTags json viewer code
 */
export function JsonViewer({ row, field, maxHeight }: JsonViewerProps) {
	const value = field ? row?.[field] : undefined;
	// A field already parsed by the API (object/array) is printed as JSON; String() would give "[object Object]".
	const json = value !== null && typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
	let formatted = json;
	try {
		formatted = JSON.stringify(JSON.parse(json), null, 2);
	} catch {
		// not valid JSON, show raw
	}
	return (
		<pre
			className={maxHeight ? `${containerClass} overflow-y-auto` : containerClass}
			style={maxHeight ? { maxHeight } : undefined}
		>
			{formatted}
		</pre>
	);
}
