import { describe, expect, it } from 'vitest';

import { formatBytes } from './formatBytes.js';

const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;
const TB = GB * 1024;

describe('formatBytes', () => {
	it('prints whole bytes below 1 KB, with no decimals', () => {
		expect(formatBytes(0)).toBe('0 B');
		expect(formatBytes(1)).toBe('1 B');
		expect(formatBytes(1023)).toBe('1023 B');
	});

	it.each([
		[KB, '1.0 KB'],
		[1536, '1.5 KB'],
		[MB, '1.0 MB'],
		[5 * MB + 512 * KB, '5.5 MB'],
		[GB, '1.0 GB'],
		[TB, '1.0 TB'],
		[3 * TB, '3.0 TB'],
	])('switches unit exactly at the powers of 1024: %i -> %s', (bytes, expected) => {
		expect(formatBytes(bytes)).toBe(expected);
	});

	// 1048575 B is 1023.999 KB: rounding to one decimal must not print the impossible "1024.0 KB".
	it('moves up a unit when rounding would print 1024', () => {
		expect(formatBytes(MB - 1)).toBe('1.0 MB');
		expect(formatBytes(GB - 1)).toBe('1.0 GB');
		expect(formatBytes(TB - 1)).toBe('1.0 TB');
		expect(formatBytes(MB - 1024)).toBe('1023.0 KB');
	});

	// Above bytes the carry is decided at ONE decimal: 1023.6 KB prints as is, only 1023.95 KB and more become 1.0 MB.
	it('does not move up while the one-decimal value is still below 1024', () => {
		expect(formatBytes(1048166)).toBe('1023.6 KB');
		expect(formatBytes(MB - 52)).toBe('1023.9 KB');
		expect(formatBytes(MB - 51)).toBe('1.0 MB');
	});

	// A fractional byte count (an axis tick, an average) that rounds to 1024 at the unit's own precision must move up too:
	// "1024 B" is the same impossible reading as "1024.0 KB".
	it('moves up from bytes when the rounded value would print 1024', () => {
		expect(formatBytes(1023.5)).toBe('1.0 KB');
		expect(formatBytes(1023.96)).toBe('1.0 KB');
		expect(formatBytes(1023.4)).toBe('1023 B');
	});

	it('stays on TB for huge values instead of printing an undefined unit', () => {
		expect(formatBytes(1024 * TB)).toBe('1024.0 TB');
		expect(formatBytes(5000 * TB)).toMatch(/ TB$/);
	});

	it('keeps the sign of a negative value', () => {
		expect(formatBytes(-512)).toBe('-512 B');
		expect(formatBytes(-KB)).toBe('-1.0 KB');
	});

	it('shows non-finite values as they are instead of "NaN undefined"', () => {
		expect(formatBytes(NaN)).toBe('NaN');
		expect(formatBytes(Infinity)).toBe('Infinity');
		expect(formatBytes(-Infinity)).toBe('-Infinity');
	});

	it('never prints the text "undefined", whatever the number', () => {
		for (const n of [0.5, 1, 99.9, 12345, 12345678, 123456789012, 1e15, 1e18, -1e18]) {
			expect(formatBytes(n)).not.toContain('undefined');
		}
	});
});
