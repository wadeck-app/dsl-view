import { getErrorMessage } from '@dsl-ui/utils/errors.js';
import { seriesColor } from './chartFormat.js';
import type { TimeWindow, XFormat } from './timeSeriesMath.js';

// What TimeSeriesChart and TimeBrush do with the props they receive. The props of a DSL node are whatever the author or the
// backend produced, so every prop is checked here, once, with a message that names the fix. The components render an inline
// alert with that message instead of throwing (see _TimeSeriesInvalid.tsx).
//
// The `*Settings` types below are the CHECKED form: every default applied, nothing optional that the drawing code relies on.

export type SeriesKind = 'line' | 'area' | 'bar';
export type SeriesAxis = 'left' | 'right';
export type YFormat = 'number' | 'clock';

export interface SeriesSettings {
	key: string;
	name: string;
	color: string;
	width: number;
	dots: number;
	pointColorKey?: string;
	detailKey?: string;
	gapDash: boolean;
	legend: boolean;
	kind: SeriesKind;
	fromKey?: string;
	decimals?: number;
	showValue: boolean;
	axis: SeriesAxis;
}

export interface BandSettings {
	from: number;
	to: number;
	color: string;
	opacity: number;
	label?: string;
}

export interface RangeAreaSettings {
	lowKey: string | null;
	highKey: string | null;
	name: string;
	color: string;
	opacity: number;
	legend: boolean;
}

export interface LegendItemSettings {
	label: string;
	color: string;
}

export interface TimeSeriesChartSettings {
	data: unknown[] | undefined;
	xKey: string;
	domain: TimeWindow | undefined;
	series: SeriesSettings[];
	bands: BandSettings[];
	rangeAreas: RangeAreaSettings[];
	legendItems: LegendItemSettings[];
	gapDashAfterDays: number | null;
	syncGroup: string;
	title: string | undefined;
	height: number;
	yUnit: string;
	yFormat: YFormat;
	yDecimals: number;
	yIncludeZero: boolean;
	yAxisWidth: number;
	marginRight: number;
	emptyMessage: string;
	xFormat: XFormat;
	yRightFormat: YFormat;
	yRightUnit: string;
	yRightDecimals: number;
	yRightIncludeZero: boolean;
	yRightAxisWidth: number;
}

export interface TimeBrushSettings {
	data: unknown[] | undefined;
	xKey: string;
	valueKey: string;
	kind: 'line' | 'bars';
	domain: TimeWindow | undefined;
	syncGroup: string;
	height: number;
	yAxisWidth: number;
	marginRight: number;
}

/** The verdict of a props check: the settings to draw, or the message to show (it names the fix). */
export type Checked<T> = { ok: true; settings: T } | { ok: false; message: string };

export const DEFAULT_Y_AXIS_WIDTH = 56;
export const DEFAULT_MARGIN_RIGHT = 16;

export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** The rows of a data list: an entry that is not a map (null, a number...) is no row. The same array when all entries are maps. */
export function recordRows(data: readonly unknown[] | undefined): Record<string, unknown>[] {
	if (data === undefined) {
		return [];
	}
	const rows: Record<string, unknown>[] = [];
	for (const entry of data) {
		if (isRecord(entry)) {
			rows.push(entry);
		}
	}
	return rows;
}

/** A value for an error message; never throws (a circular or BigInt value must not turn a message into a crash). `none` stands for undefined / a function. */
export function show(v: unknown, none: string = 'undefined'): string {
	try {
		return JSON.stringify(v) ?? none;
	} catch {
		try {
			return String(v);
		} catch {
			return '[unprintable value]';
		}
	}
}

function num(v: unknown, fallback: number, what: string): number {
	if (v === undefined || v === null || v === '') {
		return fallback;
	}
	let n: number;
	try {
		n = typeof v === 'number' ? v : Number(v);
	} catch {
		n = NaN;
	}
	if (!Number.isFinite(n)) {
		throw new Error(`${what} must be a number, got ${show(v)}.`);
	}
	return n;
}

function required(v: unknown, what: string): number {
	if (v === undefined || v === null || v === '') {
		throw new Error(`${what} is required.`);
	}
	return num(v, 0, what);
}

function str(v: unknown, what: string): string {
	if (typeof v !== 'string' || v === '') {
		throw new Error(`${what} must be a non-empty text, got ${show(v, 'nothing')}.`);
	}
	return v;
}

/** A text prop: the text, or the fallback when it is not one. */
function text(v: unknown, fallback: string): string {
	return typeof v === 'string' ? v : fallback;
}

function seriesKind(v: unknown, index: number): SeriesKind {
	if (v === undefined || v === null || v === 'line') {
		return 'line';
	}
	if (v === 'area' || v === 'bar') {
		return v;
	}
	throw new Error(`series[${index}].kind must be "line", "area" or "bar", got ${show(v)}.`);
}

function yFormat(v: unknown, what: string = 'yFormat'): YFormat {
	if (v === undefined || v === null || v === 'number') {
		return 'number';
	}
	if (v === 'clock') {
		return 'clock';
	}
	throw new Error(`${what} must be "number" or "clock", got ${show(v)}.`);
}

function xFormat(v: unknown): XFormat {
	if (v === undefined || v === null || v === 'date') {
		return 'date';
	}
	if (v === 'time' || v === 'datetime') {
		return v;
	}
	throw new Error(`xFormat must be "date", "time" or "datetime", got ${show(v)}.`);
}

function seriesAxis(v: unknown, index: number): SeriesAxis {
	if (v === undefined || v === null || v === 'left') {
		return 'left';
	}
	if (v === 'right') {
		return 'right';
	}
	throw new Error(`series[${index}].axis must be "left" or "right", got ${show(v)}.`);
}

function list(v: unknown, what: string): unknown[] {
	if (v === undefined || v === null) {
		return [];
	}
	if (!Array.isArray(v)) {
		throw new Error(`${what} must be a list, got ${show(v)}.`);
	}
	return v;
}

function domainOf(raw: unknown): TimeWindow | undefined {
	if (raw === undefined || raw === null) {
		return undefined;
	}
	if (!Array.isArray(raw) || raw.length !== 2 || raw.some(v => typeof v !== 'number' || !Number.isFinite(v)) || raw[0] >= raw[1]) {
		throw new Error(`domain must be [min, max] with min < max, got ${show(raw)}.`);
	}
	return [raw[0], raw[1]];
}

function dataOf(raw: unknown, hint: string): unknown[] | undefined {
	if (raw === undefined || raw === null) {
		return undefined;
	}
	if (!Array.isArray(raw)) {
		throw new Error(`data must be a list of rows${hint}, got ${show(raw)}.`);
	}
	return raw;
}

const RIGHT_AXIS_KEYS = ['yRightFormat', 'yRightUnit', 'yRightDecimals', 'yRightIncludeZero', 'yRightAxisWidth'];

function seriesOf(raw: unknown, i: number): SeriesSettings {
	if (!isRecord(raw)) {
		throw new Error(`series[${i}] must be a map with key and name (and optionally color).`);
	}
	const kind = seriesKind(raw['kind'], i);
	const fromKey = typeof raw['fromKey'] === 'string' && raw['fromKey'] !== '' ? raw['fromKey'] : undefined;
	if (fromKey !== undefined && kind !== 'bar') {
		throw new Error(`series[${i}].fromKey only applies to a bar (add kind: bar), got kind "${kind}".`);
	}
	// No colour: the next entry of the theme palette, as the Chart does. A colour that is not a text is refused, not ignored.
	const given = raw['color'];
	if (given !== undefined && given !== null && typeof given !== 'string') {
		throw new Error(`series[${i}].color must be a non-empty text, got ${show(given, 'nothing')}.`);
	}
	return {
		key: str(raw['key'], `series[${i}].key`),
		name: str(raw['name'], `series[${i}].name`),
		color: seriesColor(i, given ?? undefined),
		width: num(raw['width'], 2, `series[${i}].width`),
		dots: num(raw['dots'], 0, `series[${i}].dots`),
		pointColorKey: typeof raw['pointColorKey'] === 'string' ? raw['pointColorKey'] : undefined,
		detailKey: typeof raw['detailKey'] === 'string' ? raw['detailKey'] : undefined,
		gapDash: raw['gapDash'] !== false,
		legend: raw['legend'] !== false,
		kind,
		axis: seriesAxis(raw['axis'], i),
		showValue: raw['showValue'] !== false,
		fromKey,
		decimals: raw['decimals'] === undefined || raw['decimals'] === null ? undefined : num(raw['decimals'], 0, `series[${i}].decimals`),
	};
}

function bandOf(raw: unknown, i: number): BandSettings {
	if (!isRecord(raw)) {
		throw new Error(`bands[${i}] must be a map with from, to and color.`);
	}
	return {
		from: required(raw['from'], `bands[${i}].from`),
		to: required(raw['to'], `bands[${i}].to`),
		color: str(raw['color'], `bands[${i}].color`),
		opacity: num(raw['opacity'], 0.12, `bands[${i}].opacity`),
		label: typeof raw['label'] === 'string' ? raw['label'] : undefined,
	};
}

function rangeAreaOf(raw: unknown, i: number): RangeAreaSettings {
	if (!isRecord(raw)) {
		throw new Error(`rangeAreas[${i}] must be a map with name and color, and lowKey and/or highKey (a missing one is the edge of the axis).`);
	}
	const low = raw['lowKey'];
	const high = raw['highKey'];
	return {
		lowKey: low === undefined || low === null ? null : str(low, `rangeAreas[${i}].lowKey`),
		highKey: high === undefined || high === null ? null : str(high, `rangeAreas[${i}].highKey`),
		name: str(raw['name'], `rangeAreas[${i}].name`),
		color: str(raw['color'], `rangeAreas[${i}].color`),
		opacity: num(raw['opacity'], 0.15, `rangeAreas[${i}].opacity`),
		legend: raw['legend'] !== false,
	};
}

function legendItemOf(raw: unknown, i: number): LegendItemSettings {
	if (!isRecord(raw)) {
		throw new Error(`legendItems[${i}] must be a map with label and color.`);
	}
	return { label: str(raw['label'], `legendItems[${i}].label`), color: str(raw['color'], `legendItems[${i}].color`) };
}

/** Throws an Error whose message names the fix. */
function buildChartSettings(node: Record<string, unknown>): TimeSeriesChartSettings {
	const data = dataOf(node['data'], ' (for example data: $sources.series.rows)');
	const series = list(node['series'], 'series').map(seriesOf);
	if (series.length === 0) {
		throw new Error('series must list at least one series ({ key, name }).');
	}
	const hasRight = series.some(s => s.axis === 'right');
	// A right-axis prop equal to its default is not "given": the generated registry may pass every prop it knows.
	const orphans = RIGHT_AXIS_KEYS.filter(k => node[k] !== undefined && node[k] !== null && !(k in RIGHT_AXIS_DEFAULTS && node[k] === RIGHT_AXIS_DEFAULTS[k]));
	if (!hasRight && orphans.length > 0) {
		throw new Error(`${orphans.join(', ')} ${orphans.length > 1 ? 'only apply' : 'only applies'} to the right axis: add axis: right to a series, or remove ${orphans.length > 1 ? 'them' : 'it'}.`);
	}
	const marginRight = num(node['marginRight'], DEFAULT_MARGIN_RIGHT, 'marginRight');
	const yRightAxisWidth = num(node['yRightAxisWidth'], DEFAULT_Y_AXIS_WIDTH, 'yRightAxisWidth');
	if (hasRight && marginRight < yRightAxisWidth) {
		throw new Error(`The right axis is drawn inside marginRight: set marginRight to at least ${yRightAxisWidth} (got ${marginRight}), the same on every stacked chart and on the TimeBrush so the plot areas stay aligned.`);
	}
	const gap = node['gapDashAfterDays'];
	return {
		data,
		xKey: text(node['xKey'], 't') || 't',
		domain: domainOf(node['domain']),
		series,
		bands: list(node['bands'], 'bands').map(bandOf),
		rangeAreas: list(node['rangeAreas'], 'rangeAreas').map(rangeAreaOf),
		legendItems: list(node['legendItems'], 'legendItems').map(legendItemOf),
		gapDashAfterDays: gap === undefined || gap === null ? null : required(gap, 'gapDashAfterDays'),
		syncGroup: typeof node['syncGroup'] === 'string' && node['syncGroup'] !== '' ? node['syncGroup'] : 'default',
		title: typeof node['title'] === 'string' ? node['title'] : undefined,
		height: num(node['height'], 220, 'height'),
		yUnit: text(node['yUnit'], ''),
		yFormat: yFormat(node['yFormat']),
		yDecimals: num(node['yDecimals'], 1, 'yDecimals'),
		yIncludeZero: node['yIncludeZero'] === true,
		yAxisWidth: num(node['yAxisWidth'], DEFAULT_Y_AXIS_WIDTH, 'yAxisWidth'),
		marginRight,
		emptyMessage: text(node['emptyMessage'], 'No data in this period'),
		xFormat: xFormat(node['xFormat']),
		yRightFormat: yFormat(node['yRightFormat'], 'yRightFormat'),
		yRightUnit: text(node['yRightUnit'], ''),
		yRightDecimals: num(node['yRightDecimals'], 1, 'yRightDecimals'),
		yRightIncludeZero: node['yRightIncludeZero'] === true,
		yRightAxisWidth,
	};
}

/** Right-axis props and their defaults. */
const RIGHT_AXIS_DEFAULTS: Record<string, unknown> = { yRightFormat: 'number', yRightUnit: '', yRightDecimals: 1, yRightIncludeZero: false, yRightAxisWidth: DEFAULT_Y_AXIS_WIDTH };

function buildBrushSettings(node: Record<string, unknown>): TimeBrushSettings {
	const data = dataOf(node['data'], '');
	if (typeof node['valueKey'] !== 'string' || node['valueKey'] === '') {
		throw new Error('valueKey is required: the field of the row drawn as the overview line.');
	}
	const kind = node['kind'];
	if (kind !== undefined && kind !== null && kind !== 'line' && kind !== 'bars') {
		throw new Error(`kind must be "line" or "bars", got ${show(kind)}.`);
	}
	const n = (key: string, fallback: number): number => {
		const v = node[key];
		return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
	};
	return {
		data,
		xKey: text(node['xKey'], 't') || 't',
		valueKey: node['valueKey'],
		kind: kind === 'bars' ? 'bars' : 'line',
		domain: domainOf(node['domain']),
		syncGroup: typeof node['syncGroup'] === 'string' && node['syncGroup'] !== '' ? node['syncGroup'] : 'default',
		height: n('height', 56),
		yAxisWidth: n('yAxisWidth', DEFAULT_Y_AXIS_WIDTH),
		marginRight: n('marginRight', DEFAULT_MARGIN_RIGHT),
	};
}

function check<T>(props: unknown, build: (node: Record<string, unknown>) => T): Checked<T> {
	try {
		return { ok: true, settings: build(isRecord(props) ? props : {}) };
	} catch (thrown) {
		return { ok: false, message: getErrorMessage(thrown) };
	}
}

/** Checks the props of a `TimeSeriesChart`; never throws. */
export function checkTimeSeriesChartProps(props: unknown): Checked<TimeSeriesChartSettings> {
	return check(props, buildChartSettings);
}

/** Checks the props of a `TimeBrush`; never throws. */
export function checkTimeBrushProps(props: unknown): Checked<TimeBrushSettings> {
	return check(props, buildBrushSettings);
}
