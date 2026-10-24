import { reportOnce } from '../dev/reportOnce.js';

export interface HoursAndMinutes {
	hours: number;
	minutes: number;
}

// A step is a whole number of minutes (the grid the picker snaps to). Anything else cannot define a grid, so it is
// reported and replaced by 1: silently stepping by 0 or NaN would leave the buttons doing nothing.
export function normalizeMinuteStep(step: number): number {
	if (Number.isInteger(step) && step >= 1) return step;
	reportOnce(`[TimePicker] minuteStep must be a whole number of minutes (1 or more), got ${String(step)}: using 1.`);
	return 1;
}

// Moves to the next grid line (multiples of `step` inside the hour). From 10:10 with step 15 that is 10:15, not 10:25;
// from the last line of the hour it carries into the next hour at :00.
export function stepMinutesUp({ hours, minutes }: HoursAndMinutes, step: number): HoursAndMinutes {
	const next = (Math.floor(minutes / step) + 1) * step;
	if (next >= 60) return { hours: (hours + 1) % 24, minutes: 0 };
	return { hours, minutes: next };
}

// Moves to the previous grid line: a minute value that is off the grid snaps down to its own line (10:10 -> 10:00 with
// step 15), one that is on the grid goes one step down. Below :00 it borrows the previous hour's last grid line.
export function stepMinutesDown({ hours, minutes }: HoursAndMinutes, step: number): HoursAndMinutes {
	const onGrid = minutes % step === 0;
	const prev = onGrid ? minutes - step : Math.floor(minutes / step) * step;
	if (prev < 0) return { hours: (hours + 23) % 24, minutes: Math.floor(59 / step) * step };
	return { hours, minutes: prev };
}
