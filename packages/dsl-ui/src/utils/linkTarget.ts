/**
 * Pure helpers shared by every dsl-ui element that can be a link (StatTile, Badge, DataTable link
 * cells): what a link target may look like and how a `{field}` template becomes one.
 */

import { fillTemplate } from './templatedPath.js';

const EXTERNAL_SCHEMES = /^(https?:|mailto:)/i;

/**
 * Why `href` cannot be used as a link target, or `null` when it can. The target may come from row
 * data (`/runs/{id}`, or a whole `{url}` field), so the check keeps a `javascript:` or `data:` value
 * from ever becoming an anchor.
 * - internal link: an absolute app path (`/modules/queue/history?status=failed`); `//host` is rejected
 *   because browsers read it as another origin.
 * - external link: http, https or mailto only.
 */
export function linkTargetProblem(href: string, external: boolean): string | null {
	if (external) {
		return EXTERNAL_SCHEMES.test(href) ? null : `an external link must start with http:, https: or mailto: (got "${href}")`;
	}
	if (!href.startsWith('/') || href.startsWith('//')) {
		return `an internal link must be an absolute app path starting with a single "/" (got "${href}"); set external: true for a full URL`;
	}
	return null;
}

export interface LinkPathResult {
	/** The resolved target, absent when `problem` is set. */
	href?: string;
	/** What is wrong with the template or its row, ready to be shown to the page author. */
	problem?: string;
}

/**
 * Fills the `{field}` placeholders of a link template from `row` (see `fillTemplate` for the encoding
 * and whole-value rules). A placeholder whose field is missing or empty is a problem, never an empty
 * segment: `/runs//logs` would be a link to another page. The target check below still guards a
 * whole value taken from the row (`{url}` must not become `javascript:...`).
 */
export function buildLinkPath(template: string, row: Record<string, unknown>, external = false): LinkPathResult {
	const { text: filled, missing } = fillTemplate(template, row);
	if (missing !== undefined) {
		return {
			problem: `placeholder {${missing}} of "${template}" has no value in this row (row keys: ${Object.keys(row).sort().join(', ') || 'none'})`,
		};
	}
	const problem = linkTargetProblem(filled, external);
	return problem ? { problem } : { href: filled };
}
