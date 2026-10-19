import { Plus } from 'lucide-react';
import React from 'react';

import { AbRow } from './AbRow.js';
import { HIDDEN_TESTS_KEY } from './abTypes.js';
import type { AbTest } from './abTypes.js';
import { isDev } from './isDev.js';
import { usePersistentSet } from './usePersistentSet.js';

export { HIDDEN_TESTS_KEY } from './abTypes.js';
export type { AbOption, AbTest } from './abTypes.js';

// z-[9999]: stays above every overlay, modal and sticky element of the page.
const DOCK_POSITION_CLASS = 'fixed bottom-6 left-1/2 z-[9999] -translate-x-1/2';
const DOCK_CLASS = 'flex flex-col gap-1.5 rounded-[1.75rem] border border-border bg-surface p-1.5 shadow-2xl';
const CHIP_CLASS = 'flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface py-1 pl-3 pr-2 text-xs text-muted hover:text-content';

/**
 * Floating A/B test bar. One test = one row: [ LABEL (hide) | option option option ... ]. Declare a test with
 * `useAbTest` and render `<AbDock tests={[...]} />`.
 *
 * One opaque dock holds every row, so the page does not show through the gaps between them. It is anchored by its
 * bottom: adding or hiding rows grows or shrinks it upwards. A hidden row keeps its choice and leaves a reminder chip.
 *
 * Development only, built in: it renders nothing outside development (see isDev.ts), so a test left in the code can
 * never reach users. `enabled` forces it on or off, e.g. for a staging build. A production build still contains the
 * code unless the bundler removes the dead branch: do not rely on this to shrink the bundle, only to hide the tool.
 *
 * Known gaps: Tab-only keyboard navigation inside a row (no roving tabindex), and no control to minimize the whole
 * dock (only per row).
 *
 * Not a DSL node: it is a React API (hook + component) for the host app's code, so it carries no `@registryCategory`.
 */
export function AbDock({ tests, enabled = isDev() }: { tests: readonly AbTest[]; enabled?: boolean }): React.ReactElement | null {
	const [hidden, toggleHidden] = usePersistentSet(HIDDEN_TESTS_KEY);
	if (!enabled) {
		return null;
	}
	const shown = tests.filter((t) => !hidden.has(t.id));
	const reminders = tests.filter((t) => hidden.has(t.id));
	return (
		<div className={DOCK_POSITION_CLASS}>
			<div data-testid="ab-dock" className={DOCK_CLASS}>
				{reminders.length > 0 ? (
					<div className="flex flex-wrap gap-1.5">
						{reminders.map((t) => (
							// violations-suppress: react/no-raw-button AbDock IS the atomic wrapper for the A/B option picker; the reminder chip owns its geometry
							<button
								key={t.id}
								type="button"
								onClick={() => toggleHidden(t.id)}
								aria-label={`Show ${t.label}`}
								title={`Show the "${t.label}" test. Current choice: ${t.summary} (it stays applied while hidden).`}
								className={CHIP_CLASS}
							>
								<span>
									{t.label}: <strong className="font-semibold text-content">{t.summary}</strong>
								</span>
								<Plus size={12} />
							</button>
						))}
					</div>
				) : null}
				{shown.map((t) => (
					<AbRow key={t.id} test={t} onHide={() => toggleHidden(t.id)} />
				))}
			</div>
		</div>
	);
}
