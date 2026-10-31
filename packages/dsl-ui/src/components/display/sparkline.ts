// Pure geometry, text and validation of the interactive sparkline: no DOM, no React, so every boundary is unit-tested.

/** One point of a sparkline. The label is whatever names the point (a date, a build number); nothing here knows what is measured. */
export interface SparkPoint {
	label: string;
	/** null when `measured` is false. */
	value: number | null;
	/** false = absent data: drawn as a gap with a dashed bridge, announced as "no data". */
	measured: boolean;
	/** Tooltip headline. Built by the data owner (format, unit); a default is derived from label and value when absent. */
	text?: string;
	/** Second tooltip line (for example the change since the previous point). */
	detail?: string | null;
}

export const SPARK_W = 60;
export const SPARK_H = 14;
/** Vertical room kept free so the marker dot is never clipped. */
const PAD_Y = 2.5;

/** JSON.stringify never throws here: a circular or BigInt value must not turn a message into a crash. */
export function show(value: unknown): string {
	try {
		return JSON.stringify(value) ?? String(value);
	} catch {
		return String(value);
	}
}

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Why `raw` cannot be used as a list of sparkline points, or null when it can. `where` names the prop in the message
 * ("trend.points", "points"). null / undefined entries of the optional fields count as absent.
 */
export function pointsProblem(raw: unknown, where: string): string | null {
	const shape = `${where} must be a list of { label: string, value: number|null, measured: boolean, text?: string, detail?: string }`;
	if (!Array.isArray(raw)) {
		return `${shape}, got ${show(raw)}.`;
	}
	for (let i = 0; i < raw.length; i++) {
		const p = raw[i] as Partial<Record<keyof SparkPoint, unknown>> | null;
		const bad =
			p === null ||
			typeof p !== 'object' ||
			typeof p.label !== 'string' ||
			typeof p.measured !== 'boolean' ||
			(p.measured ? !isFiniteNumber(p.value) : p.value !== null && p.value !== undefined && !isFiniteNumber(p.value)) ||
			(p.text != null && typeof p.text !== 'string') ||
			(p.detail != null && typeof p.detail !== 'string');
		if (bad) {
			return `${shape} (a measured point needs a finite number value); entry ${i} is ${show(p)}.`;
		}
	}
	return null;
}

/** Why `raw` cannot be used as a list of plain values (`number|null`), or null when it can. */
export function sparkValuesProblem(raw: unknown, where: string): string | null {
	if (!Array.isArray(raw) || raw.some(v => v !== null && !isFiniteNumber(v))) {
		return `${where} must be a list of finite numbers or null (no value), got ${show(raw)}.`;
	}
	return null;
}

/** Values only (no labels): the position stands in for the label. */
export function pointsFromValues(values: readonly (number | null)[]): SparkPoint[] {
	return values.map((value, i) => ({ label: `#${i + 1}`, value, measured: value !== null }));
}

export function pointText(p: SparkPoint): string {
	return p.text ?? (p.measured && p.value !== null ? `${p.label}: ${p.value}` : `${p.label}: no data`);
}

/** Text read by assistive technology for a point: headline and detail. */
export function pointAnnouncement(p: SparkPoint): string {
	const detail = p.measured ? p.detail : null;
	return detail ? `${pointText(p)}, ${detail}` : pointText(p);
}

export function xOf(index: number, count: number, width: number): number {
	return count <= 1 ? width / 2 : (index * width) / (count - 1);
}

/** Index of the point nearest to a horizontal position measured from the left edge of the sparkline; clamped to the ends. -1 when there is no point. */
export function nearestIndex(relX: number, width: number, count: number): number {
	if (count <= 0) {
		return -1;
	}
	if (count === 1 || width <= 0) {
		return 0;
	}
	const raw = Math.round((relX / width) * (count - 1));
	// A pointer event without coordinates gives NaN: the first point, never a NaN index.
	if (Number.isNaN(raw)) {
		return 0;
	}
	return Math.min(count - 1, Math.max(0, raw));
}

/** Keyboard move of the marker: arrows step, Home/End jump; null when the key is not ours or nothing would change. */
export function stepIndex(current: number, key: string, count: number): number | null {
	if (count <= 0) {
		return null;
	}
	let next: number;
	if (key === 'ArrowLeft' || key === 'ArrowDown') {
		next = current - 1;
	} else if (key === 'ArrowRight' || key === 'ArrowUp') {
		next = current + 1;
	} else if (key === 'Home') {
		next = 0;
	} else if (key === 'End') {
		next = count - 1;
	} else {
		return null;
	}
	next = Math.min(count - 1, Math.max(0, next));
	return next === current ? null : next;
}

export interface SparkLayout {
	/** x of every point. */
	xs: number[];
	/** y of every point; null for an absent point. */
	ys: (number | null)[];
	/** Runs of consecutive measured points with at least two points, as "x,y x,y". */
	solid: string[];
	/** Dashed bridges across absent points: [x1, y1, x2, y2]. */
	dashed: [number, number, number, number][];
	/** Measured points alone between gaps (or alone in the window): a one-point line draws nothing. */
	dots: [number, number][];
}

const fix = (n: number): number => Number(n.toFixed(1));

export function layoutSpark(points: readonly SparkPoint[], width: number = SPARK_W, height: number = SPARK_H): SparkLayout {
	const present = points.filter(p => p.measured && p.value !== null).map(p => p.value as number);
	const min = present.length > 0 ? Math.min(...present) : 0;
	const span = present.length > 0 ? Math.max(...present) - min : 0;
	// A range wider than the largest float (1e308 and -1e308) overflows to Infinity: flat, instead of NaN coordinates.
	const flat = span === 0 || !Number.isFinite(span);
	const yOf = (v: number): number => (flat ? height / 2 : height - PAD_Y - ((v - min) / span) * (height - 2 * PAD_Y));
	const xs = points.map((_, i) => fix(xOf(i, points.length, width)));
	const ys = points.map(p => (p.measured && p.value !== null ? fix(yOf(p.value)) : null));
	const solid: string[] = [];
	const dashed: [number, number, number, number][] = [];
	const dots: [number, number][] = [];
	let run: string[] = [];
	let runStart = -1;
	let lastMeasured = -1;
	const flush = (): void => {
		if (run.length >= 2) {
			solid.push(run.join(' '));
		} else if (run.length === 1) {
			dots.push([xs[runStart]!, ys[runStart]!]);
		}
		run = [];
	};
	points.forEach((_, i) => {
		const y = ys[i];
		if (y === null || y === undefined) {
			flush();
			return;
		}
		if (lastMeasured >= 0 && lastMeasured !== i - 1) {
			dashed.push([xs[lastMeasured]!, ys[lastMeasured]!, xs[i]!, y]);
		}
		if (run.length === 0) {
			runStart = i;
		}
		run.push(`${xs[i]},${y}`);
		lastMeasured = i;
	});
	flush();
	return { xs, ys, solid, dashed, dots };
}

/** y on the dashed bridge for an absent point, null when it is not between two measured points. */
export function bridgeY(ys: readonly (number | null)[], index: number): number | null {
	if (ys[index] !== null && ys[index] !== undefined) {
		return ys[index]!;
	}
	let before = -1;
	let after = -1;
	for (let i = index - 1; i >= 0; i--) {
		if (ys[i] != null) {
			before = i;
			break;
		}
	}
	for (let i = index + 1; i < ys.length; i++) {
		if (ys[i] != null) {
			after = i;
			break;
		}
	}
	if (before < 0 || after < 0) {
		return null;
	}
	const t = (index - before) / (after - before);
	return fix(ys[before]! + t * (ys[after]! - ys[before]!));
}

export interface Size {
	w: number;
	h: number;
}

export interface Rect {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

/**
 * Top-left of a tooltip for a sparkline: horizontally centred on `anchorX` (it follows the pointer) and clamped to the
 * viewport; vertically ABOVE `avoid` (the tile of the hovered figure) so it never covers the tile's content. Below the tile
 * only when there is no room above and more room below; a tooltip that fits neither side is clamped inside the viewport.
 */
export function placeTooltip(anchorX: number, avoid: Rect, tip: Size, viewport: Size, gap = 6, margin = 4): { left: number; top: number; side: 'above' | 'below' } {
	const left = Math.max(margin, Math.min(anchorX - tip.w / 2, viewport.w - tip.w - margin));
	const roomAbove = avoid.top - gap - margin;
	const roomBelow = viewport.h - margin - (avoid.bottom + gap);
	const above = roomAbove >= tip.h || roomAbove >= roomBelow;
	const raw = above ? avoid.top - gap - tip.h : avoid.bottom + gap;
	return { left, top: Math.max(margin, Math.min(raw, viewport.h - tip.h - margin)), side: above ? 'above' : 'below' };
}
