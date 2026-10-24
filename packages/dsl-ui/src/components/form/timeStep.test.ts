import { afterEach, describe, expect, it, vi } from 'vitest';

import { normalizeMinuteStep, stepMinutesDown, stepMinutesUp } from './timeStep.js';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('stepMinutesUp snaps to the next grid line', () => {
	it.each([
		[{ hours: 10, minutes: 0 }, 15, { hours: 10, minutes: 15 }], // on the grid: one step
		[{ hours: 10, minutes: 10 }, 15, { hours: 10, minutes: 15 }], // off the grid: the next line, not 10:25
		[{ hours: 10, minutes: 14 }, 15, { hours: 10, minutes: 15 }],
		[{ hours: 10, minutes: 15 }, 15, { hours: 10, minutes: 30 }],
		[{ hours: 10, minutes: 45 }, 15, { hours: 11, minutes: 0 }], // last line of the hour carries
		[{ hours: 10, minutes: 50 }, 15, { hours: 11, minutes: 0 }], // off the grid past the last line carries too
		[{ hours: 23, minutes: 45 }, 15, { hours: 0, minutes: 0 }], // wraps through midnight
		[{ hours: 10, minutes: 59 }, 1, { hours: 11, minutes: 0 }],
		[{ hours: 10, minutes: 56 }, 7, { hours: 11, minutes: 0 }], // 7 does not divide 60: 56 is the last line
		[{ hours: 10, minutes: 30 }, 60, { hours: 11, minutes: 0 }], // a one-hour step only has the :00 line
	])('%j by %i gives %j', (start, step, expected) => {
		expect(stepMinutesUp(start, step)).toStrictEqual(expected);
	});
});

describe('stepMinutesDown snaps to the previous grid line', () => {
	it.each([
		[{ hours: 10, minutes: 30 }, 15, { hours: 10, minutes: 15 }], // on the grid: one step
		[{ hours: 10, minutes: 10 }, 15, { hours: 10, minutes: 0 }], // off the grid: its own line, not 09:45
		[{ hours: 10, minutes: 16 }, 15, { hours: 10, minutes: 15 }],
		[{ hours: 10, minutes: 15 }, 15, { hours: 10, minutes: 0 }],
		[{ hours: 10, minutes: 0 }, 15, { hours: 9, minutes: 45 }], // below :00 borrows the previous hour's last line
		[{ hours: 0, minutes: 0 }, 15, { hours: 23, minutes: 45 }], // wraps through midnight
		[{ hours: 0, minutes: 0 }, 1, { hours: 23, minutes: 59 }],
		[{ hours: 10, minutes: 0 }, 7, { hours: 9, minutes: 56 }], // the previous hour's last line of a 7-minute grid
		[{ hours: 10, minutes: 0 }, 60, { hours: 9, minutes: 0 }],
	])('%j by %i gives %j', (start, step, expected) => {
		expect(stepMinutesDown(start, step)).toStrictEqual(expected);
	});

	it('going up then down returns to the starting line for every grid value', () => {
		for (const step of [1, 5, 10, 15, 20, 30]) {
			for (let minutes = 0; minutes < 60; minutes += step) {
				const start = { hours: 10, minutes };
				expect(stepMinutesDown(stepMinutesUp(start, step), step)).toStrictEqual(start);
			}
		}
	});
});

describe('normalizeMinuteStep', () => {
	it('keeps a valid whole step without a word', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		expect(normalizeMinuteStep(15)).toBe(15);
		expect(normalizeMinuteStep(1)).toBe(1);

		expect(warn).not.toHaveBeenCalled();
	});

	it.each([[0], [-5], [2.5], [Number.NaN], [Number.POSITIVE_INFINITY]])('replaces %s by 1 and says why', invalid => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		expect(normalizeMinuteStep(invalid)).toBe(1);

		expect(warn).toHaveBeenCalledTimes(1);
		expect(String(warn.mock.calls[0]![0])).toContain(`minuteStep must be a whole number of minutes (1 or more), got ${String(invalid)}`);
	});
});
