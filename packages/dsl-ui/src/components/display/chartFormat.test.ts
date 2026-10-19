import { describe, expect, it } from 'vitest';
import { CHART_PALETTE, formatXTick, formatYTick, seriesColor } from './chartFormat.js';

describe('formatYTick', () => {
	it('keeps the historical bytes format by default', () => {
		expect(formatYTick(512)).toBe('512');
		expect(formatYTick(1753)).toBe('1.7 KB');
		expect(formatYTick(5 * 1024 * 1024)).toBe('5.0 MB');
		expect(formatYTick(3 * 1024 * 1024 * 1024)).toBe('3.0 GB');
	});

	it('formats counts compactly with yFormat number', () => {
		const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
		expect(formatYTick(950, 'number')).toBe('950');
		expect(formatYTick(1753, 'number')).toBe(compact.format(1753));
		expect(formatYTick(1753, 'number')).not.toMatch(/KB/);
		expect(formatYTick(2_500_000, 'number')).toMatch(/2[.,]5/);
	});

	it('appends yUnit', () => {
		expect(formatYTick(42, 'number', '%')).toBe('42%');
		expect(formatYTick(12, 'number', ' ms')).toBe('12 ms');
	});

	it('returns non-numeric values as is', () => {
		expect(formatYTick('n/a', 'number')).toBe('n/a');
	});
});

describe('formatXTick', () => {
	const ts = new Date(2026, 9, 19, 14, 5, 0).getTime();

	it('shows a category value as is, whatever xFormat says', () => {
		expect(formatXTick('10:05', 'category', 'time')).toBe('10:05');
	});

	it('formats date, time and datetime in local time', () => {
		expect(formatXTick(ts, 'time')).toBe(new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(ts));
		const time = formatXTick(ts, 'time', 'time');
		expect(time).toBe(new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(ts));
		expect(time).toMatch(/05/);
		expect(formatXTick(ts, 'time', 'datetime')).toContain(time);
	});

	it('returns an unparsable time value as is', () => {
		expect(formatXTick('not a date', 'time', 'time')).toBe('not a date');
	});
});

describe('seriesColor', () => {
	it('uses the explicit colour', () => {
		expect(seriesColor(0, '#ff0000')).toBe('#ff0000');
	});

	it('defaults to the theme accent, then cycles the palette', () => {
		expect(seriesColor(0, undefined)).toBe('var(--color-primary-solid)');
		expect(seriesColor(1, undefined)).toBe(CHART_PALETTE[1]);
		expect(seriesColor(CHART_PALETTE.length, undefined)).toBe(CHART_PALETTE[0]);
	});
});
