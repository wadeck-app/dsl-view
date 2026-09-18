export type CronFreq = 'minutely' | 'every-n-min' | 'hourly' | 'daily' | 'weekdays' | 'weekly' | 'monthly';

/**
 * What the wizard is describing, as data.
 *
 * An object rather than the six positional arguments this replaced - `buildCron(freq, n, h, m,
 * day, weekdays)`. Two of those were only meaningful for one frequency each, and a caller had to
 * pass filler values for the rest. That shape is also why `hours` was a single number for so long:
 * widening a positional parameter is invisible at every call site, so nobody did.
 */
export interface CronSpec {
	freq: CronFreq;
	/** For 'every-n-min'. */
	everyNMinutes: number;
	/**
	 * The hours the job fires at, not "the hour".
	 *
	 * Real schedules fire more than once a day - `10 10,19 * * *` is a scraper that runs morning
	 * and evening, and it is what the jobs in the wild actually look like. A single-hour builder
	 * silently rewrote the second firing out of existence the moment it was applied.
	 */
	hours: number[];
	minute: number;
	dayOfMonth: number;
	/** Monday-first, seven entries. */
	weekdays: boolean[];
}

export const CRON_SPEC_DEFAULTS: CronSpec = {
	freq: 'daily',
	everyNMinutes: 10,
	hours: [10],
	minute: 0,
	dayOfMonth: 1,
	weekdays: [true, true, true, true, true, false, false],
};

/**
 * Sorted, de-duplicated, in range.
 *
 * The `[0]` fallback is defensive only: the wizard refuses to unselect the last hour, so an empty
 * list cannot be produced through the UI. It exists because an empty hour field is not a valid
 * expression, and a live preview must not be allowed to show one.
 */
function hourField(hours: number[]): string {
	const valid = [...new Set(hours)].filter(h => Number.isInteger(h) && h >= 0 && h <= 23).sort((a, b) => a - b);
	return (valid.length > 0 ? valid : [0]).join(',');
}

/** Builds a standard 5-field expression: minute hour day-of-month month day-of-week. */
export function buildCron(spec: CronSpec): string {
	const { freq, everyNMinutes, hours, minute, dayOfMonth, weekdays } = spec;
	const h = hourField(hours);
	switch (freq) {
		case 'minutely':    return '* * * * *';
		case 'every-n-min': return `*/${everyNMinutes} * * * *`;
		case 'hourly':      return `${minute} * * * *`;
		case 'daily':       return `${minute} ${h} * * *`;
		case 'weekdays':    return `${minute} ${h} * * 1-5`;
		case 'weekly': {
			// Cron day-of-week is 1-based from Monday here, so the index shifts by one. Falling back
			// to Monday keeps the expression valid when nothing is ticked.
			const picked = weekdays.map((on, i) => (on ? i + 1 : null)).filter(Boolean).join(',') || '1';
			return `${minute} ${h} * * ${picked}`;
		}
		case 'monthly':     return `${minute} ${h} ${dayOfMonth} * *`;
		default:            return '';
	}
}

const NUM_LIST = /^\d+(,\d+)*$/;

function parseHours(field: string): number[] | null {
	if (!NUM_LIST.test(field)) {
		return null;
	}
	const hours = field.split(',').map(Number);
	return hours.every(h => h >= 0 && h <= 23) ? hours : null;
}

/**
 * Reads an expression back into a spec, or null when the wizard cannot express it.
 *
 * Null is the honest answer: the builder covers a deliberate subset of cron, and a spec that only
 * approximates the expression would silently rewrite the user's schedule the moment Apply is
 * pressed. The caller keeps its defaults and leaves the field alone instead.
 *
 * This is what makes the `value` prop mean something. It was declared and then never read - the
 * wizard always opened on its own defaults, so opening it on `10 10,19 * * *` and applying
 * replaced a twice-daily schedule with a once-daily one.
 */
export function parseCronToSpec(expr: string | null | undefined): CronSpec | null {
	if (!expr || !expr.trim()) {
		return null;
	}
	const parts = expr.trim().split(/\s+/);
	if (parts.length !== 5) {
		return null;   // the optional sixth field is outside what this wizard describes
	}
	const [min, hour, dom, mon, dow] = parts as [string, string, string, string, string];
	if (mon !== '*') {
		return null;
	}
	const base = { ...CRON_SPEC_DEFAULTS };

	if (min === '*' && hour === '*' && dom === '*' && dow === '*') {
		return { ...base, freq: 'minutely' };
	}
	const step = /^\*\/(\d+)$/.exec(min);
	if (step && hour === '*' && dom === '*' && dow === '*') {
		return { ...base, freq: 'every-n-min', everyNMinutes: Number(step[1]) };
	}
	if (!/^\d+$/.test(min) || Number(min) > 59) {
		return null;
	}
	const minute = Number(min);
	if (hour === '*' && dom === '*' && dow === '*') {
		return { ...base, freq: 'hourly', minute };
	}
	const hours = parseHours(hour);
	if (hours === null) {
		return null;
	}
	if (dom === '*' && dow === '*') {
		return { ...base, freq: 'daily', minute, hours };
	}
	if (dom === '*' && dow === '1-5') {
		return { ...base, freq: 'weekdays', minute, hours };
	}
	if (dom === '*' && NUM_LIST.test(dow)) {
		const days = dow.split(',').map(Number);
		// 0 and 7 both mean Sunday in cron; this wizard's array is Monday-first with Sunday last.
		if (!days.every(d => d >= 0 && d <= 7)) {
			return null;
		}
		const weekdays = Array.from({ length: 7 }, (_, i) => days.includes(i + 1) || (i === 6 && days.includes(0)));
		return { ...base, freq: 'weekly', minute, hours, weekdays };
	}
	if (dow === '*' && /^\d+$/.test(dom)) {
		const day = Number(dom);
		return day >= 1 && day <= 28 ? { ...base, freq: 'monthly', minute, hours, dayOfMonth: day } : null;
	}
	return null;
}
