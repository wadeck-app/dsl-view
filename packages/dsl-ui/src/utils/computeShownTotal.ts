/**
 * Derives `{ shown, total }` from a data source that is either a plain array (shown = total =
 * array length) or an object carrying a nested entries array plus an explicit total count
 * (falling back to the entries length when no total field is present). Both shapes occur across
 * real `$sources` today - a bare array (e.g. a rows list) or a paginated envelope object.
 */
export function computeShownTotal(
	raw: Record<string, unknown> | unknown[] | null | undefined,
	entriesField: string,
	totalField: string
): { shown: number; total: number } {
	if (Array.isArray(raw)) {
		return { shown: raw.length, total: raw.length };
	}
	if (raw != null && typeof raw === 'object') {
		const entries = raw[entriesField];
		const shown = Array.isArray(entries) ? entries.length : 0;
		const total = (raw[totalField] as number | undefined) ?? shown;
		return { shown, total };
	}
	return { shown: 0, total: 0 };
}
