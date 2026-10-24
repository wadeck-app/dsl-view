export type ChartYFormat = 'bytes' | 'number';
export type ChartXFormat = 'date' | 'time' | 'datetime';

// Theme-driven series colours, cycled by series index. CSS variables (not hex) so the same
// markup follows light and dark; every entry is readable on both `--color-surface` values.
export const CHART_PALETTE: readonly string[] = [
	'var(--color-primary-solid)',
	'var(--color-success)',
	'var(--color-warning)',
	'var(--color-danger)',
	'var(--color-hue-purple-text)',
	'var(--color-hue-cyan-text)',
	'var(--color-hue-orange-text)',
];

// An empty `color:` (YAML `color: ""`) is "no colour": an empty CSS colour would draw an invisible series.
export function seriesColor(index: number, color: string | undefined): string {
	return color || CHART_PALETTE[index % CHART_PALETTE.length]!;
}

function formatBytes(n: number): string {
	if (n >= 1024 * 1024 * 1024) {
		return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
	}
	if (n >= 1024 * 1024) {
		return `${(n / (1024 * 1024)).toFixed(1)} MB`;
	}
	if (n >= 1024) {
		return `${(n / 1024).toFixed(1)} KB`;
	}
	return String(n);
}

// Compact and locale-aware: 1753 -> "1.8K" (en). At most one decimal, so ticks stay short.
const compactNumber = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });

export function formatYTick(value: unknown, yFormat: ChartYFormat = 'bytes', yUnit?: string): string {
	const n = Number(value);
	if (!isFinite(n)) {
		return String(value);
	}
	const formatted = yFormat === 'number' ? compactNumber.format(n) : formatBytes(n);
	return yUnit ? `${formatted}${yUnit}` : formatted;
}

const dateFormat = { month: 'short', day: 'numeric' } as const;
const timeFormat = { hour: '2-digit', minute: '2-digit' } as const;
const dateTimeFormat = { ...dateFormat, ...timeFormat } as const;

/**
 * `xFormat` only applies to `xAxisType: time`; all formats render in the viewer's LOCAL time zone.
 * A category axis shows the value as is.
 */
export function formatXTick(value: unknown, xAxisType: 'time' | 'category', xFormat: ChartXFormat = 'date'): string {
	if (xAxisType !== 'time') {
		return String(value);
	}
	const d = new Date(value as string | number);
	if (isNaN(d.getTime())) {
		return String(value);
	}
	const options = xFormat === 'time' ? timeFormat : xFormat === 'datetime' ? dateTimeFormat : dateFormat;
	return new Intl.DateTimeFormat(undefined, options).format(d);
}
