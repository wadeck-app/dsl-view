import React, { createContext, useContext, useMemo } from 'react';

import { createDateFormatter } from './dateFormatter.js';
import type { DateFormatter } from './dateFormatter.js';
import { DEFAULT_DATE_SETTINGS } from './dateSettings.js';

const DateFormatContext = createContext<DateFormatter | null>(null);

let defaultFormatter: DateFormatter | undefined;

/**
 * The formatter used when no `DateFormatProvider` is above: `DEFAULT_DATE_SETTINGS` (English `en-GB`, 24h clock, the time
 * zone of the computer, never the browser language). Created on first use and kept, so Storybook and standalone pages
 * show dates like an app whose user never opened the date settings.
 */
export function getDefaultDateFormatter(): DateFormatter {
	defaultFormatter ??= createDateFormatter(DEFAULT_DATE_SETTINGS);
	return defaultFormatter;
}

export interface DateFormatProviderProps {
	/** Built by the app with `createDateFormatter(settings)`; a new instance with the same `key` changes nothing. */
	formatter: DateFormatter;
	children?: React.ReactNode;
}

/**
 * Gives every date of the subtree (DataTable date columns, DateText, RelativeDate, Chart axes, date and time pickers) the one
 * formatter the app built from the user's settings. A change of the formatter's `key` re-renders them all.
 */
export function DateFormatProvider({ formatter, children }: DateFormatProviderProps): React.ReactElement {
	// Keyed on `key`, not on the instance: an app that rebuilds its formatter on every render must not re-render every date.
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const stable = useMemo(() => formatter, [formatter.key]);
	return <DateFormatContext.Provider value={stable}>{children}</DateFormatContext.Provider>;
}

/** The formatter of the nearest `DateFormatProvider`, or the documented default (see `getDefaultDateFormatter`) without one. */
export function useDateFormat(): DateFormatter {
	return useContext(DateFormatContext) ?? getDefaultDateFormatter();
}

/** Whether the formatter writes a 12h clock (am/pm), read from what it actually prints. */
export function usesTwelveHourClock(formatter: DateFormatter): boolean {
	return formatter.intl({ hour: 'numeric' }).resolvedOptions().hour12 === true;
}
