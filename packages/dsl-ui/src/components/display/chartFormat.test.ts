import { describe, expect, it } from 'vitest';
import { CHART_PALETTE, formatXTick, formatYTick, seriesColor } from './chartFormat.js';

describe('formatYTick', () => {
	// Bytes ticks use the same formatter as the DataTable `bytes` column (utils/formatBytes).
	it('formats bytes by default with the shared byte formatter', () => {
		expect(formatYTick(512)).toBe('512 B');
		expect(formatYTick(1753)).toBe('1.7 KB');
		expect(formatYTick(5 * 1024 * 1024)).toBe('5.0 MB');
		expect(formatYTick(3 * 1024 * 1024 * 1024)).toBe('3.0 GB');
		expect(formatYTick(5 * 1024 ** 4)).toBe('5.0 TB');
	});

	it('switches unit exactly at each power-of-1024 boundary', () => {
		expect(formatYTick(1023)).toBe('1023 B');
		expect(formatYTick(1024)).toBe('1.0 KB');
		expect(formatYTick(1024 * 1024 - 1024)).toBe('1023.0 KB');
		expect(formatYTick(1024 * 1024)).toBe('1.0 MB');
		expect(formatYTick(1024 * 1024 * 1024 - 1024 * 1024)).toBe('1023.0 MB');
		expect(formatYTick(1024 * 1024 * 1024)).toBe('1.0 GB');
	});

	it('moves up a unit when rounding would print 1024.0 of the lower one', () => {
		expect(formatYTick(1024 * 1024 - 1)).toBe('1.0 MB');
		expect(formatYTick(1024 * 1024 * 1024 - 1)).toBe('1.0 GB');
	});

	it('selects the tick format from yFormat', () => {
		expect(formatYTick(2048, 'bytes')).toBe('2.0 KB');
		expect(formatYTick(2048, 'number')).not.toMatch(/KB/);
	});

	it('does not append a unit when yUnit is empty or absent', () => {
		expect(formatYTick(5, 'number', '')).toBe('5');
		expect(formatYTick(5, 'number', undefined)).toBe('5');
	});

	// The implementation formats with the host locale. Expected values are written as locale-independent
	// patterns (decimal separator "." or ","), never computed with the same Intl call as the code under test.
	it('formats counts compactly with yFormat number', () => {
		expect(formatYTick(950, 'number')).toBe('950');
		expect(formatYTick(1753, 'number')).toMatch(/^1[.,]8\D*$/);
		expect(formatYTick(1753, 'number')).not.toMatch(/KB/);
		expect(formatYTick(1753, 'number').length).toBeLessThan('1753'.length + 2);
		expect(formatYTick(2_500_000, 'number')).toMatch(/^2[.,]5\D*$/);
	});

	it('keeps at most one decimal and no unit for zero and sub-thousand counts', () => {
		expect(formatYTick(0, 'number')).toBe('0');
		expect(formatYTick(999, 'number')).toBe('999');
		expect(formatYTick(1050, 'number')).toMatch(/^1(?:[.,]1)?\D*$/);
	});

	it('accepts numeric strings as values and rejects non-finite numbers as text', () => {
		expect(formatYTick('2048')).toBe('2.0 KB');
		expect(formatYTick(Infinity, 'number')).toBe('Infinity');
		expect(formatYTick(NaN, 'bytes')).toBe('NaN');
	});

	it('scales negative byte values like positive ones and prints zero with its unit', () => {
		expect(formatYTick(0)).toBe('0 B');
		expect(formatYTick(-2048)).toBe('-2.0 KB');
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

	// Each format must carry exactly its own parts: date has no clock, time has no date, datetime has both.
	it('keeps the parts of each format apart', () => {
		const date = formatXTick(ts, 'time', 'date');
		const time = formatXTick(ts, 'time', 'time');
		const dateTime = formatXTick(ts, 'time', 'datetime');
		expect(date).toBe(formatXTick(ts, 'time'));
		expect(date).not.toContain(time);
		expect(time).not.toContain(date);
		expect(dateTime).toContain(date.replace(/\.$/, ''));
		expect(dateTime).toContain(time);
		expect(dateTime.length).toBeGreaterThan(Math.max(date.length, time.length));
	});

	it('renders the same instant given as a timestamp, a Date-parsable string or a Date number identically', () => {
		const iso = new Date(ts).toISOString();
		expect(formatXTick(iso, 'time', 'datetime')).toBe(formatXTick(ts, 'time', 'datetime'));
	});

	it('uses the local time zone, not UTC: the clock text follows getHours/getMinutes', () => {
		const local = new Date(2026, 0, 5, 23, 59);
		const text = formatXTick(local.getTime(), 'time', 'time');
		expect(text).toMatch(/11|23/);
		expect(text).toMatch(/59/);
	});

	it('returns an unparsable time value as is', () => {
		expect(formatXTick('not a date', 'time', 'time')).toBe('not a date');
	});
});

// The documented order (consumer reference, Chart): accent, success, warning, danger, purple, cyan, orange.
// Series are coloured by position, so reordering would recolour every existing chart.
describe('CHART_PALETTE', () => {
	it('keeps the documented order, as theme variables rather than fixed colours', () => {
		expect(CHART_PALETTE).toEqual([
			'var(--color-primary-solid)',
			'var(--color-success)',
			'var(--color-warning)',
			'var(--color-danger)',
			'var(--color-hue-purple-text)',
			'var(--color-hue-cyan-text)',
			'var(--color-hue-orange-text)',
		]);
		for (const entry of CHART_PALETTE) {
			expect(entry).toMatch(/^var\(--color-[a-z-]+\)$/);
		}
	});

	it('has no duplicate, so neighbouring series never share a colour', () => {
		expect(new Set(CHART_PALETTE).size).toBe(CHART_PALETTE.length);
	});
});

describe('seriesColor', () => {
	it('uses the explicit colour', () => {
		expect(seriesColor(0, '#ff0000')).toBe('#ff0000');
	});

	it('treats an empty colour as no colour (an empty CSS colour would hide the series)', () => {
		expect(seriesColor(2, '')).toBe(CHART_PALETTE[2]);
	});

	it('defaults to the theme accent, then cycles the palette', () => {
		expect(seriesColor(0, undefined)).toBe('var(--color-primary-solid)');
		expect(seriesColor(1, undefined)).toBe(CHART_PALETTE[1]);
		expect(seriesColor(CHART_PALETTE.length, undefined)).toBe(CHART_PALETTE[0]);
	});
});
