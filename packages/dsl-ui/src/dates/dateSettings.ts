// The date settings a consumer keeps (the storage of them is the app's: dsl-ui only defines the shape, the defaults and the validation).
export const AUTO_LOCALE = 'auto';
export const LOCAL_TIME_ZONE = 'local';

export const DATE_PRESETS = ['locale', 'iso'] as const;
export const HOUR_CYCLES = ['auto', '12h', '24h'] as const;
export const WEEK_STARTS = ['auto', 'monday', 'sunday', 'saturday'] as const;
export const WEEKDAY_STYLES = ['narrow', 'short', 'long'] as const;

export interface DateSettings {
	// A BCP 47 tag ("en-GB", "fr-FR"), or "auto" = the language of the browser. The default is English, never the browser's.
	locale: string;
	// "locale": the conventions of the language; "iso": 2026-10-24 18:38 (always 24h).
	preset: (typeof DATE_PRESETS)[number];
	// Only for the "locale" preset: "auto" follows the language.
	hourCycle: (typeof HOUR_CYCLES)[number];
	// "local" (the time zone of the computer), "UTC" or an IANA name ("Europe/Paris").
	timeZone: string;
	// First day of the week in calendars and weekday lists; "auto" follows the language.
	weekStart: (typeof WEEK_STARTS)[number];
	weekdayStyle: (typeof WEEKDAY_STYLES)[number];
}

// English with day-first dates and a 24h clock: what the tables already showed before the setting existed.
export const DEFAULT_DATE_SETTINGS: DateSettings = {
	locale: 'en-GB',
	preset: 'locale',
	hourCycle: 'auto',
	timeZone: LOCAL_TIME_ZONE,
	weekStart: 'auto',
	weekdayStyle: 'short',
};

function isOneOf<T extends string>(allowed: readonly T[], value: unknown): value is T {
	return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

// Why `locale` cannot be used, or undefined when it can.
export function localeProblem(locale: string): string | undefined {
	if (locale === AUTO_LOCALE) {
		return undefined;
	}
	try {
		const [canonical] = Intl.getCanonicalLocales(locale);
		if (canonical === undefined || Intl.DateTimeFormat.supportedLocalesOf([canonical]).length === 0) {
			return `this browser has no date data for "${locale}"`;
		}
		return undefined;
	} catch {
		return `"${locale}" is not a language tag (examples: "en-GB", "fr-FR", "de")`;
	}
}

// Why `timeZone` cannot be used, or undefined when it can.
export function timeZoneProblem(timeZone: string): string | undefined {
	if (timeZone === LOCAL_TIME_ZONE) {
		return undefined;
	}
	try {
		new Intl.DateTimeFormat('en', { timeZone });
		return undefined;
	} catch {
		return `"${timeZone}" is not a time zone (use "local", "UTC" or a name like "Europe/Paris")`;
	}
}

// Reads the stored value. Every field that is missing keeps its default; every field that is wrong keeps its default too and
// is reported in `problems`, so a corrupted value is said and never silently half applied.
export function parseDateSettings(raw: unknown): { settings: DateSettings; problems: string[] } {
	const problems: string[] = [];
	const settings: DateSettings = { ...DEFAULT_DATE_SETTINGS };
	if (raw === undefined || raw === null) {
		return { settings, problems };
	}
	if (typeof raw !== 'object' || Array.isArray(raw)) {
		return { settings, problems: [`expected an object, got ${Array.isArray(raw) ? 'an array' : typeof raw}`] };
	}
	const given = raw as Record<string, unknown>;
	for (const key of Object.keys(given)) {
		if (!(key in DEFAULT_DATE_SETTINGS)) {
			problems.push(`"${key}" is not a date setting (known: ${Object.keys(DEFAULT_DATE_SETTINGS).join(', ')})`);
		}
	}
	const text = (key: 'locale' | 'timeZone', check: (value: string) => string | undefined): void => {
		const value = given[key];
		if (value === undefined) {
			return;
		}
		const why = typeof value !== 'string' ? 'must be a text' : check(value);
		if (why === undefined) {
			settings[key] = value as string;
		} else {
			problems.push(`"${key}": ${why}; using "${DEFAULT_DATE_SETTINGS[key]}"`);
		}
	};
	text('locale', localeProblem);
	text('timeZone', timeZoneProblem);
	const choice = <K extends 'preset' | 'hourCycle' | 'weekStart' | 'weekdayStyle'>(key: K, allowed: readonly DateSettings[K][]): void => {
		const value = given[key];
		if (value === undefined) {
			return;
		}
		if (isOneOf(allowed as readonly string[], value)) {
			settings[key] = value as DateSettings[K];
		} else {
			problems.push(`"${key}": ${JSON.stringify(value)} is not one of ${allowed.map((a) => `"${a}"`).join(', ')}; using "${DEFAULT_DATE_SETTINGS[key]}"`);
		}
	};
	choice('preset', DATE_PRESETS);
	choice('hourCycle', HOUR_CYCLES);
	choice('weekStart', WEEK_STARTS);
	choice('weekdayStyle', WEEKDAY_STYLES);
	return { settings, problems };
}
