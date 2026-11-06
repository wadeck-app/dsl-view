import { EyeOff } from 'lucide-react';
import React, { useEffect, useId, useRef } from 'react';

import type { AbTest } from './abTypes.js';

// Beyond this many options a row wraps onto a second line instead of squeezing the labels.
const MAX_COLUMNS = 10;

// The row sits on the two tracks of the dock (label column, options), so every label column has the width of the longest label.
const ROW_CLASS = 'grid gap-x-0 items-stretch overflow-hidden rounded-[1.25rem] border border-border bg-surface text-xs';
// max-w: the label never takes more than 40% of the window, so on a narrow screen the options keep room (and scroll).
const LABEL_CLASS = 'flex min-w-0 max-w-[min(20rem,40vw)] items-center justify-between gap-1 border-r border-border bg-bg pl-4 pr-2 text-xs font-medium text-muted';
const HIDE_CLASS = 'shrink-0 cursor-pointer rounded-full p-1 text-muted hover:bg-surface hover:text-content';
// py-1.5 + text-sm: at least 32px tall, a comfortable target to compare many variants.
const CELL_BASE = 'whitespace-nowrap rounded-full px-3 py-1.5 text-center text-sm font-semibold transition-colors cursor-pointer';
const CELL_ON = 'bg-primary-solid text-white';
const CELL_OFF = 'text-muted hover:bg-bg hover:text-content';

// Keyboard focus only (a click also focuses a button, and its hint would then stay on screen). Where the engine does not
// know the selector, the hint is shown rather than lost.
function isKeyboardFocus(el: HTMLElement): boolean {
	try {
		return el.matches(':focus-visible');
	} catch {
		return true;
	}
}

/**
 * Rows share the label column of the dock (subgrid), so the labels line up. A label wider than the column is cut; its title has it whole.
 *
 * `onHint` receives the hint of the option under the pointer or holding the keyboard focus, and null when it leaves.
 * `folded`: the dock is folded (hidden); the chosen option is brought back into view when it unfolds.
 */
export function AbRow({
	test,
	onHide,
	onHint,
	folded = false,
}: {
	test: AbTest;
	onHide: () => void;
	onHint?: (hint: string | null) => void;
	folded?: boolean;
}): React.ReactElement {
	const cell = (id: string): string => `${CELL_BASE} ${id === test.value ? CELL_ON : CELL_OFF}`;
	const columns = Math.min(test.options.length, MAX_COLUMNS);
	const hintIdBase = useId();
	const selectedRef = useRef<HTMLButtonElement | null>(null);
	const groupRef = useRef<HTMLDivElement | null>(null);
	// The row scrolls sideways when it does not fit (narrow screen): keep the chosen option visible, on mount and on each change.
	useEffect(() => {
		const el = selectedRef.current;
		// jsdom has no scrollIntoView; a display:none (folded) dock has no layout to scroll.
		if (folded || !el || typeof el.scrollIntoView !== 'function') {
			return;
		}
		const reveal = (): void => el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
		reveal();
		// Layout settles after the first paint (fonts change the option widths, the dock sizes itself, the window resizes): reveal again then.
		const group = groupRef.current;
		if (!group || typeof ResizeObserver === 'undefined') {
			return;
		}
		const observer = new ResizeObserver(reveal);
		observer.observe(group);
		observer.observe(el);
		return () => observer.disconnect();
	}, [test.value, folded]);
	return (
		<div className={ROW_CLASS} style={{ gridTemplateColumns: 'subgrid', gridColumn: '1 / -1' }}>
			<span className={LABEL_CLASS} title={test.label}>
				<span className="truncate">{test.label}</span>
				{/* violations-suppress: react/no-raw-button AbDock IS the atomic wrapper for the A/B option picker; its row buttons own their geometry */}
				<button
					type="button"
					onClick={onHide}
					aria-label={`Hide ${test.label}`}
					title={`Hide the "${test.label}" test. Its choice stays applied; a reminder chip lets you bring it back.`}
					className={HIDE_CLASS}
				>
					<EyeOff size={12} />
				</button>
			</span>
			<div
				ref={groupRef}
				role="group"
				aria-label={test.label}
				// A column is never narrower than its label (no cell drawn under its neighbour). Few options (Off / On) keep a
				// normal cell width, left-aligned, instead of stretching over the whole row.
				style={{ gridTemplateColumns: `repeat(${columns}, minmax(max-content, ${test.options.length <= 3 ? '6rem' : '1fr'}))` }}
				className="grid min-w-0 gap-1 overflow-x-auto p-1"
			>
				{test.options.map((o, index) => {
					const selected = o.id === test.value;
					const hintId = `${hintIdBase}-${index}`;
					return (
						<React.Fragment key={o.id}>
							{/* The hint as the accessible description (the name stays the label). `title` alone is mouse-only. */}
							<span id={hintId} className="sr-only">
								{o.title}
							</span>
							{/* violations-suppress: react/no-raw-button AbDock IS the atomic wrapper for the A/B option picker; its row buttons own their geometry */}
							<button
								ref={selected ? selectedRef : undefined}
								type="button"
								onClick={() => test.onSelect(o.id)}
								onFocus={(e) => {
									if (isKeyboardFocus(e.currentTarget)) {
										onHint?.(o.title);
									}
								}}
								onBlur={() => onHint?.(null)}
								onMouseEnter={() => onHint?.(o.title)}
								onMouseLeave={() => onHint?.(null)}
								aria-pressed={selected}
								aria-describedby={hintId}
								title={o.title}
								className={cell(o.id)}
							>
								{o.label}
							</button>
						</React.Fragment>
					);
				})}
			</div>
		</div>
	);
}
