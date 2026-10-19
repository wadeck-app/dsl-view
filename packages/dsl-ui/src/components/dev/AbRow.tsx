import { EyeOff } from 'lucide-react';
import React from 'react';

import type { AbTest } from './abTypes.js';

// Beyond this many options a row wraps onto a second line instead of squeezing the labels.
const MAX_COLUMNS = 10;

// Wide enough for 10 labels on one line each; never wider than the window.
const ROW_CLASS = 'flex w-[56rem] max-w-[calc(100vw-2rem)] items-stretch overflow-hidden rounded-[1.25rem] border border-border bg-surface text-xs';
const LABEL_CLASS = 'flex w-40 shrink-0 items-center justify-between gap-1 border-r border-border bg-bg pl-4 pr-2 text-[10px] font-medium uppercase tracking-wider text-muted';
const HIDE_CLASS = 'shrink-0 cursor-pointer rounded-full p-1 text-muted hover:bg-surface hover:text-content';
const CELL_BASE = 'whitespace-nowrap rounded-full py-1 text-center font-semibold transition-colors cursor-pointer';
const CELL_ON = 'bg-primary-solid text-white';
const CELL_OFF = 'text-muted hover:bg-bg hover:text-content';

// Every row has the same width and the same label column, so the labels line up.
export function AbRow({ test, onHide }: { test: AbTest; onHide: () => void }): React.ReactElement {
	const cell = (id: string): string => `${CELL_BASE} ${id === test.value ? CELL_ON : CELL_OFF}`;
	const columns = Math.min(test.options.length, MAX_COLUMNS);
	return (
		<div className={ROW_CLASS}>
			<span className={LABEL_CLASS}>
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
				role="group"
				aria-label={test.label}
				// Few options (Off / On) keep a normal cell width, left-aligned, instead of stretching over the whole row.
				style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, ${test.options.length <= 3 ? '6rem' : '1fr'}))` }}
				className="grid flex-1 gap-1 p-1"
			>
				{test.options.map((o) => (
					// violations-suppress: react/no-raw-button AbDock IS the atomic wrapper for the A/B option picker; its row buttons own their geometry
					<button key={o.id} type="button" onClick={() => test.onSelect(o.id)} aria-pressed={o.id === test.value} title={o.title} className={cell(o.id)}>
						{o.label}
					</button>
				))}
			</div>
		</div>
	);
}
