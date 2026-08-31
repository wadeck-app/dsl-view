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
	});
});
