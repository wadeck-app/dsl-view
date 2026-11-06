import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import React, { useEffect, useId, useRef, useState } from 'react';

import { AbCopyReport } from './AbCopyReport.js';
import { nestedAboveParent } from './abOrder.js';
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
// The frame is a strip over the content area (from the left inset to the window's right edge) that centres the dock and
// lets clicks through (pointer-events-none); the dock and the copy button take them back.
const FRAME_CLASS = 'pointer-events-none fixed bottom-6 z-[9999] flex items-end justify-center gap-2 px-4';
// w-max: as wide as the widest row. min-w-0 lets it shrink; each row then scrolls sideways.
const DOCK_BOX_CLASS = 'pointer-events-auto relative min-w-0 w-max';
// Never wider than the strip (so never under a side menu), nor than the window minus a small margin.
const DOCK_BOX_MAX_WIDTH = 'min(100%, calc(100vw - 1rem))';
// The frame sits this far above the bottom of the window (bottom-6): the page must leave that room too.
const FRAME_BOTTOM_OFFSET = '1.5rem';
// Hint of the hovered or keyboard-focused option, above the dock (absolute: it never moves a row).
const HINT_CLASS = 'pointer-events-none absolute bottom-full left-1/2 mb-4 w-max max-w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-content shadow-lg';
/**
 * Left edge of the area the dock may use. `--ab-dock-inset-left` (the `insetLeft` prop or a host stylesheet) wins, then
 * `--app-shell-menu-width` (published by `AppShell`), then 0px: no shell, the whole window.
 */
export const DOCK_INSET_LEFT = 'var(--ab-dock-inset-left, var(--app-shell-menu-width, 0px))';
// Track 1: the label of every row, as wide as the longest label (10rem min, 35vw on a narrow window; the label caps itself at 20rem / 40vw). Track 2: the options.
const LABEL_AND_OPTIONS_TRACKS = 'minmax(min(10rem, 35vw), max-content) minmax(0, 1fr)';
const DOCK_CLASS = 'gap-1.5 rounded-[1.75rem] border border-border bg-surface p-1.5 shadow-2xl';
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
 * Placement: centred on the content area, never wider than it. The dock spans from a left inset to the window's right
 * edge. The inset is, in order: the `insetLeft` prop (any CSS length), the CSS variable `--ab-dock-inset-left`, the
 * variable `--app-shell-menu-width` that `AppShell` publishes on the document root while mounted, then 0px (no shell:
 * the whole window). So under an `AppShell` nothing has to be configured. A host with its own side menu sets
 * `--ab-dock-inset-left` (or passes `insetLeft`).
 *
 * "Copy report" is a small icon button at the bottom right, beside the rows (not one of them). It copies the page URL
 * and the choice of each visible test; it is disabled when every test is hidden and absent while the dock is folded.
 *
 * Narrow windows: the dock never exceeds the window width; each row scrolls sideways and keeps the chosen option in view.
 * Nested tests (an AbTest inside a variant) are listed ABOVE their parent: the dock grows upwards, so the row just clicked stays under the pointer.
 * The hint of the hovered or keyboard-focused option shows above the dock (it is also the option's accessible description).
 * The host page gets a spacer of the dock's height (folded: the pill's) at the end of its flow, so the dock never hides the last content.
 * That works when the document scrolls; an app with its own inner scroll container must leave the room itself.
 *
 * Known gap: Tab-only keyboard navigation inside a row (no roving tabindex).
 *
 * Not a DSL node: it is a React API (hook + component) for the host app's code, so it carries no `@registryCategory`.
 */
export function AbDock({ tests, enabled = isDev(), insetLeft }: { tests: readonly AbTest[]; enabled?: boolean; insetLeft?: string }): React.ReactElement | null {
	// Off (production by default): the tool reads nothing from the storage, so a stale value cannot even log a warning.
	const [hidden, toggleHidden] = usePersistentSet(HIDDEN_TESTS_KEY, enabled);
	// The fold state is read even with no test yet: a test registering later must find the stored state, not 'open'.
	const [dockState, setDockState] = usePersistentChoice(COLLAPSED_DOCK_KEY, COLLAPSE_OPTIONS, 'open', 'dock state', undefined, enabled);
	const dockId = useId();
	const collapseRef = useRef<HTMLButtonElement>(null);
	const pillRef = useRef<HTMLButtonElement>(null);
	const frameRef = useRef<HTMLDivElement>(null);
	const [hint, setHint] = useState<string | null>(null);
	// Height of the fixed frame (dock or folded pill), reserved at the end of the page flow.
	const [reservedHeight, setReservedHeight] = useState(0);
	const active = enabled && tests.length > 0;
	// Where the focus goes after a toggle the user made (not after a change coming from another tab or the first render).
	const focusAfterToggle = useRef<'pill' | 'collapse' | null>(null);
	const collapsed = dockState === 'collapsed';
	useEffect(() => {
		const frame = frameRef.current;
		if (!active || !frame) {
			return;
		}
		const measure = (): void => setReservedHeight(Math.ceil(frame.getBoundingClientRect().height));
		measure();
		// jsdom and very old engines have no ResizeObserver: the height is then measured once.
		if (typeof ResizeObserver === 'undefined') {
			return;
		}
		const observer = new ResizeObserver(measure);
		observer.observe(frame);
		return () => observer.disconnect();
	}, [active]);
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
	if (!active) {
		return null;
	}
	const collapse = (): void => {
		focusAfterToggle.current = 'pill';
		setHint(null);
		setDockState('collapsed');
	};
	const expand = (): void => {
		focusAfterToggle.current = 'collapse';
		setDockState('open');
	};
	const shown = nestedAboveParent(tests).filter((t) => !hidden.has(t.id));
	const reminders = tests.filter((t) => hidden.has(t.id));
	return (
		<>
		<div
			ref={frameRef}
			data-testid="ab-dock-frame"
			className={FRAME_CLASS}
			style={{ left: DOCK_INSET_LEFT, right: 0, ...(insetLeft === undefined ? {} : ({ '--ab-dock-inset-left': insetLeft } as React.CSSProperties)) }}
		>
			<div className={DOCK_BOX_CLASS} style={{ maxWidth: DOCK_BOX_MAX_WIDTH }}>
			{hint !== null && !collapsed ? (
				<div data-testid="ab-dock-hint" aria-hidden="true" className={HINT_CLASS}>
					{hint}
				</div>
			) : null}
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
				className={`${collapsed ? 'hidden' : 'grid'} ${DOCK_CLASS}`}
				style={{ gridTemplateColumns: LABEL_AND_OPTIONS_TRACKS }}
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
					<div className="flex flex-wrap gap-1.5" style={{ gridColumn: '1 / -1' }}>
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
					<AbRow
							key={t.id}
							test={t}
							folded={collapsed}
							onHint={setHint}
							onHide={() => {
								setHint(null);
								toggleHidden(t.id);
							}}
						/>
				))}
			</div>
			</div>
			{collapsed ? null : <AbCopyReport shown={shown} hidden={reminders} />}
		</div>
		{/* Room for the fixed frame in the page flow, so the end of the page (a form) can be scrolled above the dock. */}
		<div aria-hidden="true" data-testid="ab-dock-spacer" style={{ height: `calc(${reservedHeight}px + ${FRAME_BOTTOM_OFFSET})`, flexShrink: 0 }} />
		</>
	);
}
