import { DAY_MS, panWindow, zoomWindow } from './timeSeriesMath.js';
import type { TimeWindow } from './timeSeriesMath.js';

/** What a key does on a focused chart. Same steps as the TimeBrush buttons (zoom factor 0.6, pan by half the window). */
export type ChartKeyAction = 'pan-earlier' | 'pan-later' | 'zoom-in' | 'zoom-out' | 'reset';

export const ZOOM_IN_FACTOR = 0.6;

/** Spoken after the summary, so a keyboard or screen reader user learns the keys. */
export const CHART_KEYS_HINT = 'Left and right arrows move the time window, plus and minus zoom, 0 shows the whole period.';

const KEY_ACTIONS: Readonly<Record<string, ChartKeyAction>> = {
	ArrowLeft: 'pan-earlier',
	ArrowRight: 'pan-later',
	'+': 'zoom-in',
	'=': 'zoom-in',
	'-': 'zoom-out',
	_: 'zoom-out',
	'0': 'reset',
};

/**
 * The action of a key press, or null when the key is not ours. Combinations with Ctrl, Meta or Alt are left to the
 * browser (Ctrl + / - / 0 is the page zoom).
 */
export function chartKeyAction(key: string, mods: { ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean } = {}): ChartKeyAction | null {
	if (mods.ctrlKey || mods.metaKey || mods.altKey) {
		return null;
	}
	// An own-property check: `constructor` or `toString` are not keys of ours.
	return Object.hasOwn(KEY_ACTIONS, key) ? KEY_ACTIONS[key]! : null;
}

/** The window after `action`; null = whole period (what the Reset button sets). */
export function applyChartKeyAction(action: ChartKeyAction, win: TimeWindow, extent: TimeWindow): TimeWindow | null {
	const span = win[1] - win[0];
	const centre = (win[0] + win[1]) / 2;
	switch (action) {
		case 'pan-earlier':
			return panWindow(win, extent, -span / 2);
		case 'pan-later':
			return panWindow(win, extent, span / 2);
		case 'zoom-in':
			return zoomWindow(win, extent, ZOOM_IN_FACTOR, centre);
		case 'zoom-out':
			return zoomWindow(win, extent, 1 / ZOOM_IN_FACTOR, centre);
		case 'reset':
			return null;
	}
}

export interface SummarySeries {
	key: string;
	name: string;
}

/**
 * One sentence per series that has values in the window: latest (with its day), min and max, and how many values.
 * Pure: the caller supplies the formatters, so the text follows the chart's units and locale.
 */
export function chartSummary(args: {
	title: string | undefined;
	rows: readonly Record<string, unknown>[];
	xKey: string;
	win: TimeWindow;
	series: readonly SummarySeries[];
	formatValue: (value: number, seriesKey: string) => string;
	formatDay: (t: number) => string;
}): string {
	const { title, rows, xKey, win, series, formatValue, formatDay } = args;
	const days = Math.max(1, Math.round((win[1] - win[0]) / DAY_MS));
	const head = `${title ?? 'Chart'}, ${formatDay(win[0] + DAY_MS / 2)} to ${formatDay(win[1] - DAY_MS / 2)} (${days} days).`;
	const parts: string[] = [];
	for (const s of series) {
		let count = 0;
		let min = Infinity;
		let max = -Infinity;
		let latest: { t: number; v: number } | null = null;
		for (const row of rows) {
			const t = row[xKey];
			const v = row[s.key];
			if (typeof t !== 'number' || typeof v !== 'number' || !Number.isFinite(v) || t < win[0] || t > win[1]) {
				continue;
			}
			count++;
			min = Math.min(min, v);
			max = Math.max(max, v);
			if (latest === null || t >= latest.t) {
				latest = { t, v };
			}
		}
		if (latest === null) {
			continue;
		}
		parts.push(`${s.name}: latest ${formatValue(latest.v, s.key)} on ${formatDay(latest.t)}, min ${formatValue(min, s.key)}, max ${formatValue(max, s.key)}, ${count} value${count === 1 ? '' : 's'}.`);
	}
	return parts.length === 0 ? `${head} No value in this period.` : `${head} ${parts.join(' ')}`;
}
