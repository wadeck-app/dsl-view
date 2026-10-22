import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import React, { useEffect, useId, useRef } from 'react';

import { AbRow } from './AbRow.js';
import { COLLAPSED_DOCK_KEY, HIDDEN_TESTS_KEY } from './abTypes.js';
import type { AbTest } from './abTypes.js';
import { isDev } from './isDev.js';
import { usePersistentChoice } from './usePersistentChoice.js';
import { usePersistentSet } from './usePersistentSet.js';

export { COLLAPSED_DOCK_KEY, HIDDEN_TESTS_KEY } from './abTypes.js';
export type { AbOption } from './abTypes.js';
export type { AbTest } from './AbTest.js';

// z-[9999]: stays above every overlay, modal and sticky element of the page.
const DOCK_POSITION_CLASS = 'fixed bottom-6 left-1/2 z-[9999] -translate-x-1/2';
const DOCK_CLASS = 'flex-col gap-1.5 rounded-[1.75rem] border border-border bg-surface p-1.5 shadow-2xl';
const CHIP_CLASS = 'flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface py-1 pl-3 pr-2 text-xs text-muted hover:text-content';
// The collapse tab sits on the top edge of the dock, so it costs no row height.
const COLLAPSE_CLASS = 'absolute -top-3 left-1/2 flex -translate-x-1/2 cursor-pointer items-center rounded-full border border-border bg-surface px-2 py-0.5 text-muted shadow hover:text-content';
const PILL_CLASS = 'flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface py-1.5 pl-3 pr-2.5 text-xs font-semibold text-muted shadow-2xl hover:text-content';
const COLLAPSE_OPTIONS = ['open', 'collapsed'] as const;

/**
 * Floating A/B test bar. One test = one row: [ LABEL (hide) | option option option ... ]. Declare a test with
 * `useAbTest` and render `<AbDock tests={[...]} />`.
 *
 * One opaque dock holds every row, so the page does not show through the gaps between them. It is anchored by its
 * bottom: adding or hiding rows grows or shrinks it upwards. A hidden row keeps its choice and leaves a reminder chip.
 *
 * The whole dock folds into a small "A/B (N)" pill (the chevron on its top edge, or Escape while the focus is inside
 * it). N counts every test, hidden rows included. Collapsing only hides the UI: every choice stays applied. The state
 * is kept in localStorage (`ab.collapsed`) and follows other tabs, like the choices.
 *
 * With no test at all it renders nothing (no chevron, no pill). Hidden rows still count as tests.
 *
 * Development only, built in: it renders nothing outside development (see isDev.ts), so a test left in the code can
 * never reach users. `enabled` forces it on or off, e.g. for a staging build. A production build still contains the
 * code unless the bundler removes the dead branch: do not rely on this to shrink the bundle, only to hide the tool.
 *
 * Known gap: Tab-only keyboard navigation inside a row (no roving tabindex).
 *
 * Not a DSL node: it is a React API (hook + component) for the host app's code, so it carries no `@registryCategory`.
 */
export function AbDock({ tests, enabled = isDev() }: { tests: readonly AbTest[]; enabled?: boolean }): React.ReactElement | null {
	const [hidden, toggleHidden] = usePersistentSet(HIDDEN_TESTS_KEY);
	// The fold state is read even with no test yet: a test registering later must find the stored state, not 'open'.
	const [dockState, setDockState] = usePersistentChoice(COLLAPSED_DOCK_KEY, COLLAPSE_OPTIONS, 'open', 'dock state', undefined, enabled);
	const dockId = useId();
	const collapseRef = useRef<HTMLButtonElement>(null);
	const pillRef = useRef<HTMLButtonElement>(null);
	// Where the focus goes after a toggle the user made (not after a change coming from another tab or the first render).
	const focusAfterToggle = useRef<'pill' | 'collapse' | null>(null);
	const collapsed = dockState === 'collapsed';
	useEffect(() => {
		const target = focusAfterToggle.current;
		focusAfterToggle.current = null;
		if (target === 'pill') {
			pillRef.current?.focus();
		} else if (target === 'collapse') {
			collapseRef.current?.focus();
		}
	}, [collapsed]);
	// Nothing to show without a test: no chevron, no pill. The stored fold state is only read, never written, here.
	if (!enabled || tests.length === 0) {
		return null;
	}
	const collapse = (): void => {
		focusAfterToggle.current = 'pill';
		setDockState('collapsed');
	};
	const expand = (): void => {
		focusAfterToggle.current = 'collapse';
		setDockState('open');
	};
	const shown = tests.filter((t) => !hidden.has(t.id));
	const reminders = tests.filter((t) => hidden.has(t.id));
	return (
		<div className={DOCK_POSITION_CLASS}>
			{collapsed ? (
				// violations-suppress: react/no-raw-button AbDock IS the atomic wrapper for the A/B option picker; the pill owns its geometry
				<button
					ref={pillRef}
					type="button"
					onClick={expand}
					aria-expanded={false}
					aria-controls={dockId}
					aria-label={`Show the A/B tests (${tests.length})`}
					title="Show the A/B tests. Every choice stays applied while the dock is folded."
					className={PILL_CLASS}
				>
					<span>A/B ({tests.length})</span>
					<ChevronUp size={12} />
				</button>
			) : null}
			<div
				id={dockId}
				data-testid="ab-dock"
				hidden={collapsed}
				className={`${collapsed ? 'hidden' : 'flex'} ${DOCK_CLASS}`}
				onKeyDown={(e) => {
					if (e.key === 'Escape' && !e.defaultPrevented) {
						e.stopPropagation();
						collapse();
					}
				}}
			>
				{/* violations-suppress: react/no-raw-button AbDock IS the atomic wrapper for the A/B option picker; the collapse tab owns its geometry */}
				<button
					ref={collapseRef}
					type="button"
					onClick={collapse}
					aria-expanded={!collapsed}
					aria-controls={dockId}
					aria-label="Fold the A/B tests"
					title="Fold the dock into a small pill (Escape does the same). Every choice stays applied."
					className={COLLAPSE_CLASS}
				>
					<ChevronDown size={12} />
				</button>
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
