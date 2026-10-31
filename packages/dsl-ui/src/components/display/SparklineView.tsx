import React from 'react';
import { createPortal } from 'react-dom';

import { reportAuthoringMistake } from '@dsl-ui/utils/devDiagnostics.js';
import { bridgeY, layoutSpark, nearestIndex, placeTooltip, pointAnnouncement, pointsProblem, pointText, SPARK_H, SPARK_W, stepIndex, xOf, type Size, type SparkPoint } from './sparkline.js';

export type { SparkPoint } from './sparkline.js';

export interface SparklineViewProps {
	/**
	 * Points, oldest first. `measured: false` is a gap, drawn as a dashed bridge between the neighbouring measured points
	 * and announced as "no data". `text` and `detail` are the tooltip lines (the data owner formats units and decimals);
	 * the defaults are `label: value` and `label: no data`. Fewer than two points draws nothing.
	 */
	points: SparkPoint[];
	/** What the series is: the accessible name of the slider ("Latency, 14 points"). */
	ariaLabel: string;
	className?: string;
}

interface Active {
	index: number;
	/** Viewport position the tooltip follows: the pointer, or the marker when moved with the keyboard. */
	x: number;
	y: number;
}

// @formatter:off
// The padding enlarges the hit area, the negative margin cancels it: the sparkline takes no more room than its drawing.
const WRAP_CLASS = 'inline-block shrink-0 -m-1 p-1 rounded cursor-crosshair touch-pan-y focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-solid)]';
// z-[9999] as the other floating layers of dsl-ui; fixed + portal, so no ancestor clips it.
const TOOLTIP_CLASS = 'fixed z-[9999] pointer-events-none max-w-xs whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-xs leading-snug text-content shadow-md';
// @formatter:on

/** The nearest themed ancestor, so the tooltip is painted in the palette of the scope it belongs to; the body otherwise. */
function portalHost(el: Element | null): Element {
	return el?.closest('[data-theme-scope]') ?? document.body;
}

/**
 * Small line chart with an inspection tooltip that follows the pointer (also touch) or the keyboard. Absent points are a
 * gap with a dashed bridge, and the tooltip says so. It is a focusable `slider`: Left/Right (and Up/Down) move the marker,
 * Home/End jump to the ends, Escape hides the tooltip, `aria-valuetext` announces the point.
 *
 * It is interactive: do not nest it in a link or a button (FigureRow keeps it beside the link).
 *
 * @registryCategory atomic
 * @registryTags sparkline trend inline chart
 */
export function SparklineView({ points, ariaLabel, className = '' }: SparklineViewProps): React.ReactElement | null {
	const problem = pointsProblem(points, 'points');
	const valid = problem === null ? points : [];
	const count = valid.length;
	const hasName = typeof ariaLabel === 'string' && ariaLabel !== '';
	const layout = React.useMemo(() => layoutSpark(valid), [valid]);
	const [active, setActive] = React.useState<Active | null>(null);
	const [size, setSize] = React.useState<Size>({ w: 160, h: 40 });
	const wrapRef = React.useRef<HTMLSpanElement>(null);
	const svgRef = React.useRef<SVGSVGElement>(null);
	const tipRef = React.useRef<HTMLDivElement>(null);
	const isActive = active !== null;

	// Only the KIND of problem is kept in render: the message strings live inside the effect, at the call of the dev-only
	// reporter, so a production bundle drops them with it.
	React.useEffect(() => {
		if (problem !== null) {
			reportAuthoringMistake(`[SparklineView] ${problem} Nothing is drawn.`);
		} else if (!hasName) {
			reportAuthoringMistake('[SparklineView] "ariaLabel" is required: it is the name a screen reader announces for the slider. Using "Sparkline" meanwhile.');
		}
	}, [problem, hasName]);

	// Measured before paint, so the first frame of the tooltip is already placed with its real size.
	React.useLayoutEffect(() => {
		const el = tipRef.current;
		if (!el) {
			return;
		}
		const r = el.getBoundingClientRect();
		if (Math.abs(r.width - size.w) > 0.5 || Math.abs(r.height - size.h) > 0.5) {
			setSize({ w: r.width, h: r.height });
		}
	});

	// A touch tooltip stays after the finger lifts: it is dismissed by a touch elsewhere or by scrolling.
	React.useEffect(() => {
		if (!isActive) {
			return;
		}
		const away = (e: Event): void => {
			if (e.type === 'pointerdown' && wrapRef.current?.contains(e.target as Node)) {
				return;
			}
			setActive(null);
		};
		document.addEventListener('pointerdown', away);
		window.addEventListener('scroll', away, true);
		return () => {
			document.removeEventListener('pointerdown', away);
			window.removeEventListener('scroll', away, true);
		};
	}, [isActive]);

	if (count < 2 || layout.solid.length + layout.dots.length === 0) {
		return null;
	}

	const fromPointer = (e: React.PointerEvent): void => {
		const rect = svgRef.current?.getBoundingClientRect();
		if (!rect) {
			return;
		}
		setActive({ index: nearestIndex(e.clientX - rect.left, rect.width, count), x: e.clientX, y: e.clientY });
	};
	const fromKeyboard = (index: number): void => {
		const rect = svgRef.current?.getBoundingClientRect();
		if (!rect) {
			return;
		}
		setActive({ index, x: rect.left + xOf(index, count, rect.width), y: rect.bottom });
	};
	const onKeyDown = (e: React.KeyboardEvent): void => {
		if (e.key === 'Escape') {
			if (active) {
				// The tooltip takes the key: an enclosing dialog must not also close.
				e.preventDefault();
				e.stopPropagation();
				setActive(null);
			}
			return;
		}
		const next = stepIndex(active?.index ?? count - 1, e.key, count);
		if (next === null) {
			// Already at an end: keep the key from scrolling the page, show the point if hidden.
			if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
				e.preventDefault();
				if (!active) {
					fromKeyboard(count - 1);
				}
			}
			return;
		}
		e.preventDefault();
		fromKeyboard(next);
	};

	const current = valid[active?.index ?? count - 1]!;
	const index = active?.index ?? -1;
	const markerX = index >= 0 ? layout.xs[index]! : 0;
	const markerY = index >= 0 ? bridgeY(layout.ys, index) : null;
	const absent = index >= 0 && !valid[index]!.measured;
	// window only exists in the browser: read once a tooltip is shown, never while rendering to a string.
	const avoid = active ? (wrapRef.current?.closest('[data-figure-cell]') ?? svgRef.current)?.getBoundingClientRect() : undefined;
	const pos = active && avoid ? placeTooltip(active.x, avoid, size, { w: window.innerWidth, h: window.innerHeight }) : null;

	return (
		<span
			ref={wrapRef}
			// A caller class that is not text (an odd DSL value) is left out instead of becoming "[object Object]" or a crash.
			className={typeof className === 'string' ? `${WRAP_CLASS} ${className}`.trim() : WRAP_CLASS}
			role="slider"
			tabIndex={0}
			aria-label={hasName ? ariaLabel : 'Sparkline'}
			aria-valuemin={0}
			aria-valuemax={count - 1}
			aria-valuenow={active?.index ?? count - 1}
			aria-valuetext={pointAnnouncement(current)}
			data-sparkline
			onPointerEnter={fromPointer}
			onPointerMove={fromPointer}
			onPointerDown={fromPointer}
			onPointerLeave={e => {
				// A finger lifting is not a leave: the touch tooltip stays until dismissed.
				if (e.pointerType !== 'touch') {
					setActive(null);
				}
			}}
			onFocus={() => {
				if (!active) {
					fromKeyboard(count - 1);
				}
			}}
			onBlur={() => setActive(null)}
			onKeyDown={onKeyDown}
		>
			{/* Dynamic geometry only: the drawing is sized in user units, colours come from token classes. */}
			<svg ref={svgRef} width={SPARK_W} height={SPARK_H} viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} focusable="false" aria-hidden="true" className="block overflow-visible">
				{layout.dashed.map(([x1, y1, x2, y2]) => (
					<line key={`d${x1}`} x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-muted opacity-80" strokeWidth={1} strokeDasharray="2 2" />
				))}
				{layout.solid.map(pts => (
					<polyline key={pts} points={pts} fill="none" className="stroke-muted" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
				))}
				{layout.dots.map(([x, y]) => (
					<circle key={`${x}`} cx={x} cy={y} r={1.3} className="fill-muted" />
				))}
				{active ? (
					<g data-spark-marker data-index={index} data-measured={absent ? 'false' : 'true'}>
						<line x1={markerX} y1={0} x2={markerX} y2={SPARK_H} className="stroke-content opacity-30" strokeWidth={1} />
						{markerY !== null ? (
							<circle cx={markerX} cy={markerY} r={2.6} strokeWidth={1} className={absent ? 'fill-surface stroke-content' : 'fill-content stroke-surface'} />
						) : null}
					</g>
				) : null}
			</svg>
			{active && pos
				? createPortal(
						// left/top are the only inline style: a viewport position computed from the pointer.
						<div ref={tipRef} role="tooltip" data-spark-tooltip className={TOOLTIP_CLASS} style={{ left: pos.left, top: pos.top }}>
							<div className="font-semibold">{pointText(valid[index]!)}</div>
							{valid[index]!.measured && valid[index]!.detail ? <div className="text-muted">{valid[index]!.detail}</div> : null}
						</div>,
						portalHost(wrapRef.current)
					)
				: null}
		</span>
	);
}
