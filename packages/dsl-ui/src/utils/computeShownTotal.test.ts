import { describe, expect, it } from 'vitest';
import { computeShownTotal } from './computeShownTotal.js';

describe('computeShownTotal', () => {
	it('derives shown/total from a plain array source', () => {
		expect(computeShownTotal([1, 2, 3], 'entries', 'total')).toEqual({ shown: 3, total: 3 });
	});

	it('derives shown from the nested entries array and total from the explicit total field', () => {
		const raw = { entries: [1, 2], total: 50 };
		expect(computeShownTotal(raw, 'entries', 'total')).toEqual({ shown: 2, total: 50 });
	});

	it('falls back to the entries length when no total field is present', () => {
		const raw = { entries: [1, 2, 3] };
		expect(computeShownTotal(raw, 'entries', 'total')).toEqual({ shown: 3, total: 3 });
	});

	it('returns zero/zero for null or undefined input', () => {
		expect(computeShownTotal(null, 'entries', 'total')).toEqual({ shown: 0, total: 0 });
		expect(computeShownTotal(undefined, 'entries', 'total')).toEqual({ shown: 0, total: 0 });
	});

	it('returns zero shown when the entries field is missing or not an array', () => {
		expect(computeShownTotal({}, 'entries', 'total')).toEqual({ shown: 0, total: 0 });
		expect(computeShownTotal({ entries: 'oops' }, 'entries', 'total')).toEqual({ shown: 0, total: 0 });
		expect(computeShownTotal({ entries: { length: 4 } }, 'entries', 'total')).toEqual({ shown: 0, total: 0 });
	});

	it('keeps an explicit total of 0 (only a missing or null total falls back to the entries length)', () => {
		expect(computeShownTotal({ entries: [1, 2], total: 0 }, 'entries', 'total')).toEqual({ shown: 2, total: 0 });
		expect(computeShownTotal({ entries: [1, 2], total: null }, 'entries', 'total')).toEqual({ shown: 2, total: 2 });
	});

	it('reports an empty array and an empty envelope as zero rows', () => {
		expect(computeShownTotal([], 'entries', 'total')).toEqual({ shown: 0, total: 0 });
		expect(computeShownTotal({ entries: [], total: 0 }, 'entries', 'total')).toEqual({ shown: 0, total: 0 });
	});

	it('reads the fields it is told to read, not hard-coded names', () => {
		const raw = { items: [1, 2, 3], count: 99, entries: [1], total: 1 };
		expect(computeShownTotal(raw, 'items', 'count')).toEqual({ shown: 3, total: 99 });
	});

	it('does not mistake a primitive source for an envelope', () => {
		expect(computeShownTotal('abc' as never, 'entries', 'total')).toEqual({ shown: 0, total: 0 });
		expect(computeShownTotal(0 as never, 'entries', 'total')).toEqual({ shown: 0, total: 0 });
	});
});
