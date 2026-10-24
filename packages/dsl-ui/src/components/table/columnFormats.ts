import type React from 'react';

/**
 * Renders one cell for an app-registered column format. Receives the raw field value and its whole row.
 */
export type ColumnFormatRenderer = (value: unknown, row: Record<string, unknown>) => React.ReactNode;

const NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;

// Formats DataTable renders itself: an app cannot shadow them, otherwise `format: bytes` would mean two things.
const BUILT_IN_FORMATS: readonly string[] = ['datetime', 'date', 'time', 'bytes', 'ms'];

const registered = new Map<string, ColumnFormatRenderer>();

/**
 * Registers an app-specific column format, usable from YAML as `format: <name>` on a DataTable column.
 *
 * Domain formats (an HTTP status swatch, an expiry countdown) belong to the app that needs them, not to dsl-ui:
 * the app calls this once at start-up, before its first page renders.
 *
 * Registering a name twice replaces the previous renderer (hot reload re-runs the app module). A name that is
 * empty, malformed or a built-in format throws, so a typo is caught at start-up instead of rendering plain text.
 */
export function registerColumnFormat(name: string, render: ColumnFormatRenderer): void {
	if (!NAME_PATTERN.test(name)) {
		throw new Error(
			`[DataTable] registerColumnFormat: invalid format name ${JSON.stringify(name)}. ` +
				`Use letters, digits, "_" or "-", starting with a letter (for example "httpStatus").`
		);
	}
	if (BUILT_IN_FORMATS.includes(name)) {
		throw new Error(
			`[DataTable] registerColumnFormat: "${name}" is a built-in format and cannot be replaced. ` +
				`Built-in formats: ${BUILT_IN_FORMATS.join(', ')}. Pick another name.`
		);
	}
	if (typeof render !== 'function') {
		throw new Error(`[DataTable] registerColumnFormat: the renderer of "${name}" must be a function (value, row) => ReactNode.`);
	}
	registered.set(name, render);
}

/** The renderer registered for `name`, or undefined. */
export function getColumnFormat(name: string): ColumnFormatRenderer | undefined {
	return registered.get(name);
}

/** Names of the app-registered formats, sorted (used in "unknown format" messages). */
export function registeredColumnFormatNames(): string[] {
	return [...registered.keys()].sort();
}

/** Test helper: forget every registered format. */
export function clearColumnFormats(): void {
	registered.clear();
}
