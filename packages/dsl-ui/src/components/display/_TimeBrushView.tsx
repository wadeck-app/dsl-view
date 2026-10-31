import React, { useMemo, useRef } from 'react';
import { Surface } from 'recharts';

import { useDateFormat } from '@dsl-ui/dates/DateFormatContext.js';

import { Button } from '../controls/_Button.js';
import { formatBrushDate } from './timeSeriesFormat.js';
import { clampWindow, DAY_MS, isFullWindow, MIN_SPAN_MS, numberAt, panWindow, xExtent, zoomWindow } from './timeSeriesMath.js';
import type { TimeWindow } from './timeSeriesMath.js';
import { recordRows } from './timeSeriesProps.js';
import type { TimeBrushSettings } from './timeSeriesProps.js';
import { useSyncWindow } from './timeSeriesSync.js';
import { useElementWidth } from './useElementWidth.js';

const HANDLE = 7;
const ZOOM_IN_FACTOR = 0.6;

type DragMode = 'pan' | 'left' | 'right';

/** SVG path of the overview: a polyline, or (kind `bars`) one tick per value rising from the bottom, the tallest filling the strip. */
function overviewPath(rows: Record<string, unknown>[], extent: TimeWindow, width: number, height: number, xKey: string, valueKey: string, kind: 'line' | 'bars'): string {
	const pts: { t: number; v: number }[] = [];
	for (const row of rows) {
		const t = numberAt(row, xKey);
		const v = numberAt(row, valueKey);
		if (t !== null && v !== null) {
			pts.push({ t, v });
		}
	}
	if (pts.length === 0) {
		return '';
	}
	// Loops: spreading a very long list into Math.min throws a RangeError.
	let lo = Infinity;
	let hi = -Infinity;
	for (const p of pts) {
		lo = Math.min(lo, p.v);
		hi = Math.max(hi, p.v);
	}
	const inner = height - 8;
	const total = extent[1] - extent[0];
	if (kind === 'bars') {
		return pts
			.map(p => {
				const x = ((p.t - extent[0]) / total) * width;
				const h = hi <= 0 ? 1 : Math.max(1, (Math.max(0, p.v) / hi) * inner);
				return `M${x.toFixed(1)} ${(4 + inner).toFixed(1)} L${x.toFixed(1)} ${(4 + inner - h).toFixed(1)}`;
			})
			.join(' ');
	}
	return pts
		.map((p, i) => {
			const x = ((p.t - extent[0]) / total) * width;
			const y = 4 + (hi === lo ? inner / 2 : inner - ((p.v - lo) / (hi - lo)) * inner);
			return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
		})
		.join(' ');
}

/** Brush body: the checked settings (see `TimeBrush`) drawn at a measured width. Renders nothing until there is something to show. */
export function TimeBrushView({ data, xKey, valueKey, kind, domain, syncGroup, height, yAxisWidth, marginRight }: TimeBrushSettings): React.ReactElement | null {
	const dates = useDateFormat();
	const rows = useMemo(() => recordRows(data), [data]);
	const ownExtent = useMemo<TimeWindow | null>(() => domain ?? xExtent(rows, xKey), [domain, rows, xKey]);
	const { window: win, extent, setWindow } = useSyncWindow(syncGroup, ownExtent);
	// A callback ref: the strip only exists once there is something to show, so it can mount after the first render.
	const [setStrip, width, strip] = useElementWidth();
	const drag = useRef<{ mode: DragMode; startX: number; win: TimeWindow } | null>(null);

	const path = useMemo(() => (extent && width > 0 ? overviewPath(rows, extent, width, height, xKey, valueKey, kind) : ''), [rows, extent, width, height, xKey, valueKey, kind]);

	if (data === undefined || !extent || !win) {
		return null;
	}
	const total = extent[1] - extent[0];
	const toX = (t: number): number => ((t - extent[0]) / total) * width;
	const toT = (x: number): number => extent[0] + (x / Math.max(1, width)) * total;
	const left = toX(win[0]);
	const right = toX(win[1]);
	const days = Math.round((win[1] - win[0]) / DAY_MS);
	const full = isFullWindow(win, extent);
	const centre = (win[0] + win[1]) / 2;

	const begin = (mode: DragMode) => (e: React.PointerEvent): void => {
		e.stopPropagation();
		strip?.setPointerCapture(e.pointerId);
		drag.current = { mode, startX: e.clientX, win };
	};
	const onMove = (e: React.PointerEvent): void => {
		const d = drag.current;
		if (!d) {
			return;
		}
		const dt = ((e.clientX - d.startX) / Math.max(1, width)) * total;
		if (d.mode === 'pan') {
			setWindow(panWindow(d.win, extent, dt));
		} else if (d.mode === 'left') {
			setWindow(clampWindow([Math.min(d.win[0] + dt, d.win[1] - MIN_SPAN_MS), d.win[1]], extent));
		} else {
			setWindow(clampWindow([d.win[0], Math.max(d.win[1] + dt, d.win[0] + MIN_SPAN_MS)], extent));
		}
	};
	const stopDrag = (): void => {
		drag.current = null;
	};

	return (
		<div className="rounded-lg border border-border bg-surface p-2" data-time-brush={syncGroup}>
			<div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
				<Button variant="secondary" size="sm" title="Zoom in" aria-label="Zoom in" onClick={() => setWindow(zoomWindow(win, extent, ZOOM_IN_FACTOR, centre))}>
					+
				</Button>
				<Button variant="secondary" size="sm" title="Zoom out" aria-label="Zoom out" onClick={() => setWindow(zoomWindow(win, extent, 1 / ZOOM_IN_FACTOR, centre))}>
					-
				</Button>
				<Button variant="secondary" size="sm" title="Earlier" aria-label="Earlier" onClick={() => setWindow(panWindow(win, extent, -(win[1] - win[0]) / 2))}>
					&lt;
				</Button>
				<Button variant="secondary" size="sm" title="Later" aria-label="Later" onClick={() => setWindow(panWindow(win, extent, (win[1] - win[0]) / 2))}>
					&gt;
				</Button>
				<Button variant="secondary" size="sm" disabled={full} title="Show the whole period" aria-label="Reset zoom" onClick={() => setWindow(null)}>
					Reset
				</Button>
				<span className="ml-1.5" data-window-label="">
					{formatBrushDate(dates, win[0] + DAY_MS / 2)} - {formatBrushDate(dates, win[1] - DAY_MS / 2)} ({days} days)
				</span>
				<span className="ml-auto">Drag a chart to pan, Ctrl + wheel to zoom, double click to reset</span>
			</div>
			<div style={{ marginLeft: yAxisWidth, marginRight }}>
				<div
					ref={setStrip}
					data-brush-strip=""
					className="relative touch-none select-none rounded bg-bg-secondary"
					style={{ height }}
					onPointerMove={onMove}
					onPointerUp={stopDrag}
					onPointerCancel={stopDrag}
					onPointerDown={e => {
						const rect = e.currentTarget.getBoundingClientRect();
						const centred = panWindow(win, extent, toT(e.clientX - rect.left) - centre);
						setWindow(centred);
						e.currentTarget.setPointerCapture(e.pointerId);
						drag.current = { mode: 'pan', startX: e.clientX, win: centred };
					}}
				>
					{width > 0 && (
						<Surface width={width} height={height} className="pointer-events-none absolute inset-0" aria-hidden="true">
							<path d={path} fill="none" stroke="var(--color-muted)" strokeWidth={1.5} />
						</Surface>
					)}
					{width > 0 && (
						<>
							<div className="pointer-events-none absolute left-0 top-0 bg-surface opacity-60" style={{ width: left, height }} />
							<div className="pointer-events-none absolute top-0 bg-surface opacity-60" style={{ left: right, width: Math.max(0, width - right), height }} />
							<div
								data-brush-window=""
								className="absolute top-0 box-border cursor-grab rounded border-2 border-primary-solid"
								style={{ left, width: Math.max(2, right - left), height }}
								onPointerDown={begin('pan')}
							/>
							<div data-brush-handle="left" className="absolute top-0 cursor-ew-resize rounded-[3px] bg-primary-solid opacity-80" style={{ left: left - HANDLE / 2, width: HANDLE, height }} onPointerDown={begin('left')} />
							<div data-brush-handle="right" className="absolute top-0 cursor-ew-resize rounded-[3px] bg-primary-solid opacity-80" style={{ left: right - HANDLE / 2, width: HANDLE, height }} onPointerDown={begin('right')} />
						</>
					)}
				</div>
			</div>
		</div>
	);
}
