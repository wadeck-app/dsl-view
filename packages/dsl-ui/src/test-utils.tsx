import { render } from '@testing-library/react';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';

import { createDateFormatter } from './dates/dateFormatter.js';
import { DEFAULT_DATE_SETTINGS } from './dates/dateSettings.js';
import { DateFormatProvider } from './dates/DateFormatContext.js';
import { ToastContext } from './components/overlay/Toast.js';

type ToastContextValue = NonNullable<React.ContextType<typeof ToastContext>>;
export const mockToast: ToastContextValue = {
	success: vi.fn(),
	error: vi.fn(),
	info: vi.fn(),
};

export function MockToastProvider({ children }: { children: React.ReactNode }) {
	return <ToastContext.Provider value={mockToast}>{children}</ToastContext.Provider>;
}

export function renderWithMocks(ui: React.ReactElement, options?: RenderOptions): RenderResult {
	return render(<MockToastProvider>{ui}</MockToastProvider>, options);
}

// The date settings before the date formatter existed: US English ("Sep 17, 2026"), Sunday-first calendars, the zone of the
// test machine. For tests of picker logic written against that look; new tests of the defaults use no provider.
const US_DATES = createDateFormatter({ ...DEFAULT_DATE_SETTINGS, locale: 'en-US', weekStart: 'sunday', hourCycle: '24h' });

export function renderWithUsDates(ui: React.ReactElement, options?: RenderOptions): RenderResult {
	return render(ui, { ...options, wrapper: ({ children }) => <DateFormatProvider formatter={US_DATES}>{children}</DateFormatProvider> });
}
