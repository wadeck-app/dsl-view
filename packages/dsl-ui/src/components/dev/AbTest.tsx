import React, { useEffect, useMemo, useRef } from 'react';

import { useAbExperiments } from './AbExperiments.js';
import type { AbTest as AbDockTest } from './abTypes.js';
import { isDev } from './isDev.js';
import { usePersistentChoice } from './usePersistentChoice.js';

// The test as the dock shows it. Same name as the node below: a type and a function do not clash, and this keeps
// `import type { AbTest }` (published before the node existed) working.
export type AbTest = AbDockTest;

export interface AbVariantSpec {
	// Name of the option in the dock.
	label: string;
	// Tooltip: what this variant changes compared with the reference one.
	hint: string;
	// The DSL node rendered while this variant is chosen.
	view: unknown;
}

export interface AbTestProps {
	// Short stable id: it names the storage key and the URL parameter (`ab.<id>`). Letters, digits, `_` and `-`.
	id: string;
	// Name of the test, shown on the left of its dock row.
	label: string;
	// The reference variant, used until someone chooses and whenever experiments are off.
	initial: string;
	/** @mapSlot view */
	variants: Record<string, AbVariantSpec>;
	renderNode: (node: unknown, ctx: Record<string, unknown>) => React.ReactNode;
}

const ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const reported = new Set<string>();

// Reported once per message: a render loop must not flood the console.
function reportOnce(message: string, log: (message: string) => void): void {
	if (!reported.has(message)) {
		reported.add(message);
		log(message);
	}
}

// What is wrong with the declaration, or null. These are authoring mistakes the build-time check also catches.
function configError({ id, label, initial, variants }: Pick<AbTestProps, 'id' | 'label' | 'initial' | 'variants'>): string | null {
	if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
		return `"id" must be a non-empty string of letters, digits, "_" or "-", got ${JSON.stringify(id)}`;
	}
	if (typeof label !== 'string' || label === '') {
		return '"label" must be a non-empty string';
	}
	if (!variants || typeof variants !== 'object' || Array.isArray(variants) || Object.keys(variants).length === 0) {
		return '"variants" must be a map with at least one variant';
	}
	if (!Object.keys(variants).includes(initial)) {
		return `"initial" is ${JSON.stringify(initial)} but the variants are: ${Object.keys(variants).join(', ')}`;
	}
	for (const [key, variant] of Object.entries(variants)) {
		const v = variant as Partial<AbVariantSpec> | null;
		if (!v || typeof v !== 'object' || typeof v.label !== 'string' || typeof v.hint !== 'string' || v.view === undefined) {
			return `variant "${key}" needs a "label", a "hint" and a "view"`;
		}
	}
	return null;
}

const ALERT_CLASS = 'rounded border border-danger bg-danger-bg p-2 text-sm text-danger';

/**
 * A/B test declared in a view: renders the CHOSEN variant's view and registers the test with the host's single dock.
 *
 * ```yaml
 * $type: AbTest
 * id: tab-style
 * label: Tab style
 * initial: pill
 * variants:
 *   pill:  { label: Pill,  hint: Tinted pill behind the active tab., view: { $type: Tabs, ... } }
 *   ring:  { label: Ring,  hint: Outline ring around the active tab., view: { $type: Tabs, ... } }
 * ```
 *
 * - Experiments run only where the host enabled them (`<AbExperiments enabled>`, default: development builds). Otherwise
 *   the node renders the `initial` variant and never reads the storage or the URL, so users of a production build see
 *   the reference view. The other variants stay in the shipped view: do not put anything confidential in them.
 * - The choice is stored in localStorage `ab.<id>`, can be forced by a link (`?ab.<id>=<variant>`) and follows other tabs.
 * - A variant may itself contain `AbTest` nodes (use other ids); they appear in the dock while their variant is shown.
 * - The same test may be repeated (identical declaration, same id): one dock row, one choice.
 * - Without an `<AbExperiments>` host in development, the node still applies the stored choice but no dock lets anyone
 *   change it: this is reported once.
 * - A bad declaration (unknown `initial`, no variants, duplicate id with a different test) is an error in the console;
 *   the node renders an alert instead of a guessed variant.
 *
 * Usable wherever a node is (page root, widget, inside another container). Not a layout box: it renders the variant's
 * view directly.
 *
 * @registryCategory disposition
 * @registryTags layout
 */
export function AbTest({ id, label, initial, variants, renderNode }: AbTestProps): React.ReactElement {
	const host = useAbExperiments();
	const enabled = host ? host.enabled : isDev();
	const error = configError({ id, label, initial, variants });
	const ids = useMemo(() => (error ? [] : Object.keys(variants)), [error, variants]);
	const key = `ab.${id}`;
	const [value, choose] = usePersistentChoice<string>(key, ids, initial, `${String(label)} variant`.toLowerCase(), key, enabled && error === null);

	const chooseRef = useRef(choose);
	chooseRef.current = choose;
	const owner = useRef(Symbol(`AbTest:${id}`)).current;
	const options = ids.map((variantId) => ({ id: variantId, label: variants[variantId]!.label, title: variants[variantId]!.hint }));
	const optionsKey = JSON.stringify(options);
	const summary = error ? '' : variants[value]?.label ?? '';

	const registrable = error === null && enabled && host !== null;
	useEffect(() => {
		if (error !== null) {
			reportOnce(`[ab] AbTest "${String(id)}": ${error}`, console.error);
		} else if (enabled && !host) {
			reportOnce(
				`[ab] AbTest "${id}" has no dock: mount <AbExperiments> once near the root of the app so the variant can be changed (the stored choice or ?${key}= still applies).`,
				console.warn
			);
		}
	}, [error, enabled, host, id, key]);

	// Refreshes the dock row without removing it first: removing and re-adding would move the row to the end on each choice.
	useEffect(() => {
		if (!registrable || !host) {
			host?.store.remove(owner, id);
			return;
		}
		const test: AbDockTest = { id, label, summary, options: JSON.parse(optionsKey) as AbDockTest['options'], value, onSelect: (variantId) => chooseRef.current(variantId) };
		host.store.set(owner, test, JSON.stringify([label, initial, optionsKey]));
	}, [registrable, host, id, label, initial, summary, optionsKey, value, owner]);

	useEffect(() => () => host?.store.remove(owner, id), [host, id, owner]);

	if (error !== null) {
		return (
			<div role="alert" className={ALERT_CLASS}>
				<strong>AbTest {JSON.stringify(id)}:</strong> {error}
			</div>
		);
	}
	// While experiments are off, usePersistentChoice returns `initial` without touching the storage or the URL.
	return <React.Fragment key={value}>{renderNode(variants[value]!.view, {})}</React.Fragment>;
}
