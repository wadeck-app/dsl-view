const PLACEHOLDER = /\{(\w+)\}/g;
const SINGLE_PLACEHOLDER = /^\{\w+\}$/;

export interface FilledTemplate {
	/** The template with every placeholder replaced; a placeholder without a value is replaced by ''. */
	text: string;
	/** The first placeholder that had no value in the row, so the caller can refuse the result. */
	missing?: string;
}

/**
 * The one `{field}` substitution shared by every dsl-ui path template (DataTable `navigateTo`,
 * link columns, StatTile/Badge `href`).
 * - Only the row's own fields count: `{constructor}` must not splice a function's source into a path.
 * - A value is percent-encoded, so one template works in a path segment (`/runs/{id}`) and in a query
 *   value (`?event={event}`): an id such as `a/b?c` stays one segment.
 * - A template that is a single placeholder (`{href}`) takes the whole target from the row (a path or
 *   URL the backend already built): encoding it would turn "/modules/x" into "%2Fmodules%2Fx".
 * - `null`, `undefined` and '' are missing; 0 and false are real data.
 */
export function fillTemplate(template: string, row: Record<string, unknown>): FilledTemplate {
	const wholeValue = SINGLE_PLACEHOLDER.test(template);
	let missing: string | undefined;
	const text = template.replace(PLACEHOLDER, (_, key: string) => {
		const value = Object.hasOwn(row, key) ? row[key] : undefined;
		if (value === undefined || value === null || value === '') {
			missing ??= key;
			return '';
		}
		return wholeValue ? String(value) : encodeURIComponent(String(value));
	});
	return missing === undefined ? { text } : { text, missing };
}

/**
 * Interpolates `{field}` placeholders in a path template from the matching key on `row`
 * (e.g. `/files/{id}` + `{ id: '42' }` -> `/files/42`), see `fillTemplate` for the rules. A missing
 * field resolves to an empty string here; callers that must not act on an incomplete path use
 * `fillTemplate` and check `missing`.
 */
export function buildTemplatedPath(template: string, row: Record<string, unknown>): string {
	return fillTemplate(template, row).text;
}
