import { reportOnce } from '@dsl-ui/components/dev/reportOnce.js';

/**
 * The entries of a `{ value, label }` option list a component can really show. An entry that is not a map or has
 * no text label (`options: [{}]`, an unresolved `$sources` row) would crash the filter that reads `label`; it is
 * left out and the page is told once how many were. The returned list keeps the order of the entries it keeps.
 *
 * @param where `Component.prop`, used in the report
 */
export function usableOptions<T extends { label: string }>(options: readonly T[], where: string): T[] {
	const usable = options.filter((option) => option !== null && typeof option === 'object' && typeof option.label === 'string');
	const dropped = options.length - usable.length;
	if (dropped > 0) {
		reportOnce(`[${where}] ${dropped} of ${options.length} option(s) have no text label and are left out: write each option as { value, label }.`);
	}
	return usable;
}
