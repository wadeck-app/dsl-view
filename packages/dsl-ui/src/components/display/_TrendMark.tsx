import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowDown, ArrowRight, ArrowUp, Minus } from 'lucide-react';

export interface TrendMarkProps {
	direction: 'up' | 'down' | 'flat' | 'none';
	/** Tooltip and accessible name of the mark. */
	text: string;
}

// @formatter:off
const ICONS: Record<TrendMarkProps['direction'], LucideIcon> = { up: ArrowUp, down: ArrowDown, flat: ArrowRight, none: Minus };
const MARK_CLASS = 'ml-0.5 inline-flex cursor-help items-center gap-1 whitespace-nowrap text-[10px] leading-none text-muted';
// @formatter:on

/** Internal building block of FigureRow (leading underscore: not a registry component). The arrow is never coloured good or bad. */
export function TrendMark({ direction, text }: TrendMarkProps): React.ReactElement {
	const Icon = ICONS[direction];
	return (
		<span className={MARK_CLASS} title={text} role="img" aria-label={text} data-trend={direction}>
			<Icon className="h-3 w-3" aria-hidden="true" />
		</span>
	);
}
