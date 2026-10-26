import { act, render, renderHook, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { createDateFormatter } from './dateFormatter.js';
import { DEFAULT_DATE_SETTINGS } from './dateSettings.js';
import { DateFormatProvider, getDefaultDateFormatter, useDateFormat, usesTwelveHourClock } from './DateFormatContext.js';

// 2026-10-24 16:38:05 UTC, a Saturday.
const INSTANT = Date.UTC(2026, 9, 24, 16, 38, 5);
const make = (change: Partial<typeof DEFAULT_DATE_SETTINGS> = {}) => createDateFormatter({ ...DEFAULT_DATE_SETTINGS, timeZone: 'UTC', ...change });

describe('useDateFormat without a provider', () => {
	it('gives the documented default: English en-GB, 24h, day first, never the browser language', () => {
		const { result } = renderHook(() => useDateFormat());
		expect(result.current.locale).toBe('en-GB');
		expect(result.current.timeZone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
		expect(result.current.key).toBe(createDateFormatter(DEFAULT_DATE_SETTINGS).key);
		expect(result.current.format(new Date(2026, 9, 24, 18, 38), 'short')).toBe('24/10/2026, 18:38');
	});

	it('is one shared instance, created once', () => {
		expect(getDefaultDateFormatter()).toBe(getDefaultDateFormatter());
		const { result } = renderHook(() => useDateFormat());
		expect(result.current).toBe(getDefaultDateFormatter());
	});
});

describe('DateFormatProvider', () => {
	it('gives its subtree the formatter it was handed, and nested providers win', () => {
		const french = make({ locale: 'fr-FR' });
		const german = make({ locale: 'de-DE' });
		function Probe({ id }: { id: string }) {
			return <span data-testid={id}>{useDateFormat().format(INSTANT, 'short', 'date')}</span>;
		}
		render(
			<DateFormatProvider formatter={french}>
				<Probe id="outer" />
				<DateFormatProvider formatter={german}>
					<Probe id="inner" />
				</DateFormatProvider>
			</DateFormatProvider>,
		);
		expect(screen.getByTestId('outer').textContent).toBe('24/10/2026');
		expect(screen.getByTestId('inner').textContent).toBe('24.10.2026');
	});

	it('keeps the same formatter instance while the key is unchanged, so an app rebuilding it on every render re-renders nothing', () => {
		const seen: unknown[] = [];
		let renders = 0;
		const Probe = React.memo(function Probe() {
			renders += 1;
			seen.push(useDateFormat());
			return null;
		});
		const view = render(
			<DateFormatProvider formatter={make()}>
				<Probe />
			</DateFormatProvider>,
		);
		view.rerender(
			<DateFormatProvider formatter={make()}>
				<Probe />
			</DateFormatProvider>,
		);
		expect(renders).toBe(1);
		expect(seen[0]).toBe(seen[seen.length - 1]);
	});

	it('re-renders every reader when the key changes, and the readers see the new settings', () => {
		function Probe() {
			return <span data-testid="p">{useDateFormat().format(INSTANT, 'short', 'time')}</span>;
		}
		const view = render(
			<DateFormatProvider formatter={make({ hourCycle: '24h' })}>
				<Probe />
			</DateFormatProvider>,
		);
		expect(screen.getByTestId('p').textContent).toBe('16:38');
		act(() => {
			view.rerender(
				<DateFormatProvider formatter={make({ hourCycle: '12h' })}>
					<Probe />
				</DateFormatProvider>,
			);
		});
		expect(screen.getByTestId('p').textContent).toMatch(/^04:38\s?pm$/i);
	});
});

describe('usesTwelveHourClock', () => {
	it('follows the clock the formatter actually writes', () => {
		expect(usesTwelveHourClock(make({ locale: 'en-GB' }))).toBe(false);
		expect(usesTwelveHourClock(make({ locale: 'en-US' }))).toBe(true);
		expect(usesTwelveHourClock(make({ locale: 'en-GB', hourCycle: '12h' }))).toBe(true);
		expect(usesTwelveHourClock(make({ locale: 'en-US', hourCycle: '24h' }))).toBe(false);
		// the iso preset is a 24h clock whatever the setting says
		expect(usesTwelveHourClock(make({ locale: 'en-US', preset: 'iso', hourCycle: '12h' }))).toBe(false);
	});
});
