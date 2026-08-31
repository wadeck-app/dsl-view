/**
 * Interpolates `{field}` placeholders in a path template from the matching key on `row`
 * (e.g. `/files/{id}` + `{ id: '42' }` -> `/files/42`). Missing keys resolve to an empty string
 * rather than throwing, since a template referencing a field absent on a given row is a
 * data/config mismatch, not a programming error worth crashing the render for.
 */
export function buildTemplatedPath(template: string, row: Record<string, unknown>): string {
	return template.replace(/\{(\w+)\}/g, (_, key: string) => String(row[key] ?? ''));
}
