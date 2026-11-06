import React from 'react';

import { reportAuthoringMistake } from '@dsl-ui/utils/devDiagnostics.js';
import { AppLink, usableLinkTarget } from '../navigation/AppLink.js';
import { TrendMark } from './_TrendMark.js';
import { SparklineView } from './SparklineView.js';
import { pointsFromValues, pointsProblem, show, sparkValuesProblem, type SparkPoint } from './sparkline.js';

export interface FigureTrend {
	/** 'none' = no direction known (shown as a dash). Never coloured good or bad: the component does not know the goal of a figure. */
	direction: 'up' | 'down' | 'flat' | 'none';
	/** Says by how much, or why there is no direction. It is the tooltip of the mark and part of the figure's accessible name. */
	text: string;
	/** Recent values, oldest first, for the sparkline; null = no value at that position. Positions stand in for labels (#1, #2...). */
	spark?: (number | null)[];
	/** Recent points, oldest first, for the sparkline: gives the tooltip its texts and tells absent points from measured ones. Wins over `spark`. */
	points?: SparkPoint[];
}

export interface Figure {
	label: string;
	/** The number, already formatted ("68.6", or "-" when unknown). A number is shown as it is. */
	value: string | number;
	/** Shown small after the value, on the same line. */
	unit?: string;
	/** Makes the figure a link (a drill-down): an app path such as `/reports/latency`, navigated through the router without a page load. */
	href?: string;
	/** Opens `href` as an external URL (http, https, mailto) in a new tab. */
	external?: boolean;
	/** Direction of the change over a period, with an optional sparkline. */
	trend?: FigureTrend;
	/**
	 * What the sparkline's accessible name says after the label (`Latency, last 7 days`). Default: the point count (`Latency, 7 points`).
	 * A value that is not text is ignored (default wording) with one development warning; an empty text means the default.
	 */
	pointsLabel?: string;
}

export interface FigureRowProps {
	/**
	 * The figures, sharing the full width of the row. Each shows `value unit` on ONE line, cut with an ellipsis when too narrow.
	 * Normally one expression (`items: $sources.stats.figures`). Deliberately NOT `@resolveDeep`: a literal `value: "$48,295"`
	 * written inline must stay text, so a `$path` nested inside an item is not resolved.
	 */
	items: Figure[];
}

const DIRECTIONS: readonly string[] = ['up', 'down', 'flat', 'none'];

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function trendProblem(t: Record<string, unknown>, at: string): string | null {
	if (typeof t['text'] !== 'string' || t['text'] === '' || !DIRECTIONS.includes(t['direction'] as string)) {
		return `${at} needs a direction (up, down, flat or none) and a non-empty text, got ${show(t)}.`;
	}
	if (t['spark'] != null) {
		const bad = sparkValuesProblem(t['spark'], `${at}.spark`);
		if (bad) {
			return bad;
		}
	}
	if (t['points'] != null) {
		return pointsProblem(t['points'], `${at}.points`);
	}
	return null;
}

/** Why one item cannot be shown, or null. The message names the path and the fix. */
function itemProblem(raw: unknown, i: number): string | null {
	const at = `items[${i}]`;
	if (!isRecord(raw)) {
		return `${at} must be { label, value, unit?, href?, trend? }, got ${show(raw)}.`;
	}
	const valueOk = typeof raw['value'] === 'string' || (typeof raw['value'] === 'number' && Number.isFinite(raw['value']));
	if (typeof raw['label'] !== 'string' || !valueOk) {
		return `${at} must have a string label and a string (or finite number) value, got ${show(raw)}.`;
	}
	for (const key of ['unit', 'href'] as const) {
		if (raw[key] != null && typeof raw[key] !== 'string') {
			return `${at}.${key} must be a string, got ${show(raw[key])}.`;
		}
	}
	if (raw['external'] != null && typeof raw['external'] !== 'boolean') {
		return `${at}.external must be true or false, got ${show(raw['external'])}.`;
	}
	if (raw['trend'] != null) {
		if (!isRecord(raw['trend'])) {
			return `${at}.trend needs a direction (up, down, flat or none) and a non-empty text, got ${show(raw['trend'])}.`;
		}
		return trendProblem(raw['trend'], `${at}.trend`);
	}
	return null;
}

interface ShownFigure {
	label: string;
	value: string;
	unit: string | undefined;
	href: string | undefined;
	external: boolean;
	trend: { direction: FigureTrend['direction']; text: string; points: SparkPoint[] | undefined } | undefined;
	pointsLabel: string | undefined;
}

/** A `pointsLabel` that is not text: ignored, and reported once by the effect that owns the message. */
interface IgnoredPointsLabel {
	index: number;
	value: unknown;
}

type Read = { problem: string; figures?: undefined; ignored?: undefined } | { problem?: undefined; figures: ShownFigure[]; ignored: IgnoredPointsLabel[] };

/**
 * The figures to show, or the problem. An absent list (undefined, null) is a source that has not loaded yet: an empty
 * row, quietly, as the generated entries do for any required list. Anything else that is not a list of valid items is a problem.
 */
function readItems(raw: unknown): Read {
	if (raw === undefined || raw === null) {
		return { figures: [], ignored: [] };
	}
	if (!Array.isArray(raw)) {
		return { problem: `items must be a list of { label, value, unit?, href?, trend? }, got ${show(raw)}.` };
	}
	for (let i = 0; i < raw.length; i++) {
		const problem = itemProblem(raw[i], i);
		if (problem) {
			return { problem };
		}
	}
	const ignored: IgnoredPointsLabel[] = [];
	const figures = (raw as Figure[]).map((f, index): ShownFigure => {
		const t = f.trend;
		const rawLabel: unknown = f.pointsLabel;
		if (rawLabel != null && typeof rawLabel !== 'string') {
			ignored.push({ index, value: rawLabel });
		}
		const points = t ? (t.points ?? (t.spark ? pointsFromValues(t.spark) : undefined)) : undefined;
		return {
			label: f.label,
			value: String(f.value),
			unit: f.unit ?? undefined,
			href: f.href ?? undefined,
			external: f.external === true,
			trend: t ? { direction: t.direction, text: t.text, points } : undefined,
			pointsLabel: typeof rawLabel === 'string' && rawLabel.trim() !== '' ? rawLabel : undefined,
		};
	});
	return { figures, ignored };
}

// @formatter:off
const CELL_CLASS = 'relative flex min-w-0 flex-1 flex-col rounded-lg border border-border bg-surface px-2.5 py-[5px] text-content';
// A linked cell: the anchor's ::after covers the whole cell, so only hover on the anchor lights it up (not the sparkline above it).
const CELL_LINK_CLASS = 'transition-colors has-[a:hover]:border-primary has-[a:hover]:bg-bg-secondary';
const LABEL_CLASS = 'min-w-0 truncate text-xs !leading-[1.2] text-muted';
const LINE_CLASS = 'flex min-w-0 items-baseline gap-[3px] whitespace-nowrap';
// The stretched link: its ::after covers the cell, the sparkline (relative z-10) stays above it and keeps its own pointer behaviour.
const ANCHOR_CLASS = `${LINE_CLASS} text-inherit no-underline after:absolute after:inset-0 after:rounded-lg focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-[var(--color-primary-solid)]`;
const ALERT_CLASS = 'rounded-lg border border-danger bg-danger-bg px-2.5 py-1.5 text-xs text-danger-text';
// @formatter:on

/**
 * A row of figures sharing the full width: label, `value unit` on one line, an optional trend arrow after the unit and an
 * optional sparkline on the label row. A figure with `href` is a link on the whole cell; the sparkline stays a separate,
 * focusable control beside it (an interactive element cannot live inside a link).
 *
 * Never throws: items it cannot show render an inline alert naming the fix, and log one development warning.
 *
 * @registryCategory composite
 * @registryTags figures kpi metrics stats row sparkline trend dashboard
 */
export function FigureRow({ items }: FigureRowProps): React.ReactElement {
	const read = React.useMemo(() => readItems(items), [items]);
	const problem = read.problem;

	// Only the KIND of problem is kept in render for the dev-only reporter: its sentence is written inside the effect, so
	// a production bundle drops it with the reporter. The alert's own text is UI and stays.
	React.useEffect(() => {
		if (problem !== undefined) {
			reportAuthoringMistake(`[FigureRow] ${problem} An alert is shown instead of the figures.`);
		}
	}, [problem]);

	// The figures are still shown: only the wording falls back to the default. The message is built here, in the dev-only reporter.
	const ignored = read.ignored;
	React.useEffect(() => {
		if (ignored !== undefined && ignored.length > 0) {
			const list = ignored.map(i => `items[${i.index}].pointsLabel must be a string, got ${show(i.value)}.`).join(' ');
			reportAuthoringMistake(`[FigureRow] ${list} The default wording (the point count) is used.`);
		}
	}, [ignored]);

	if (read.problem !== undefined) {
		return (
			<div role="alert" data-invalid-props className={ALERT_CLASS}>
				FigureRow: {read.problem}
			</div>
		);
	}

	return (
		<div className="flex w-full gap-2" data-figure-row>
			{read.figures.map((item, index) => {
				const trend = item.trend;
				const target = usableLinkTarget(item.href, item.external, 'FigureRow');
				const aria = `${item.label}: ${item.value}${item.unit ? ` ${item.unit}` : ''}${trend ? `. ${trend.text}` : ''}`;
				const valueLine = (
					<>
						<span className="text-xl font-bold !leading-[1.2] text-content">{item.value}</span>
						{item.unit ? <span className="text-xs text-muted">{item.unit}</span> : null}
						{trend ? <TrendMark direction={trend.direction} text={trend.text} /> : null}
					</>
				);
				return (
					<div key={index} data-figure-cell className={target ? `${CELL_CLASS} ${CELL_LINK_CLASS}` : CELL_CLASS}>
						{trend?.points ? (
							<div className="flex min-w-0 items-center justify-between gap-1">
								<span className={LABEL_CLASS}>{item.label}</span>
								<SparklineView className="relative z-10" points={trend.points} ariaLabel={`${item.label}, ${item.pointsLabel ?? `${trend.points.length} points`}`} />
							</div>
						) : (
							<div className={LABEL_CLASS}>{item.label}</div>
						)}
						{target ? (
							<AppLink href={target} external={item.external} aria-label={aria} className={ANCHOR_CLASS}>
								{valueLine}
							</AppLink>
						) : (
							<div className={LINE_CLASS}>{valueLine}</div>
						)}
					</div>
				);
			})}
		</div>
	);
}
