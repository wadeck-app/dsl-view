import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Chart } from '../components/display/Chart.js';
import { DateText } from '../components/display/DateText.js';
import { RelativeDate } from '../components/display/RelativeDate.js';
import { DatePicker } from '../components/form/DatePicker.js';
import { TimePicker } from '../components/form/TimePicker.js';
import { DataTable } from '../components/table/DataTable.js';
import { createDateFormatter } from '../dates/dateFormatter.js';
import { DateFormatProvider } from '../dates/DateFormatContext.js';
import { DEFAULT_DATE_SETTINGS } from '../dates/dateSettings.js';
import type { DateSettings } from '../dates/dateSettings.js';

// One moment, written by every date consumer of dsl-ui through the one formatter of the date settings. The default
// (no provider) is English en-GB, 24h, the zone of the computer; each story below sets a provider.
const AT = Date.UTC(2026, 9, 24, 16, 38, 5, 123);
const HOUR = 3600_000;

const ROWS = [
	{ id: '1', event: 'build finished', at: new Date(AT).toISOString() },
	{ id: '2', event: 'deploy started', at: new Date(AT + 26 * HOUR).toISOString() },
	{ id: '3', event: 'not a date', at: 'whenever' },
];
const SERIES = Array.from({ length: 8 }, (_, i) => ({ ts: AT + i * 3 * HOUR, events: [3, 5, 4, 8, 6, 9, 7, 10][i] }));

function Showcase() {
	const [day, setDay] = React.useState<Date | null>(new Date(2026, 9, 24));
	const [time, setTime] = React.useState<string | null>('18:38');
	return (
		<div className="flex w-[40rem] flex-col gap-6 p-4 text-sm text-content">
			<section data-testid="table">
				<h3 className="mb-1 font-semibold">DataTable: short (default), medium, date, time</h3>
				<DataTable
					rows={ROWS as never}
					columns={
						[
							{ field: 'event', label: 'Event' },
							{ field: 'at', label: 'Short', format: 'datetime' },
							{ field: 'at', label: 'Medium', format: 'datetime', dateStyle: 'medium' },
							{ field: 'at', label: 'Date', format: 'date' },
							{ field: 'at', label: 'Time', format: 'time' },
						] as never
					}
				/>
			</section>
			<section data-testid="text" className="flex flex-col gap-1">
				<h3 className="font-semibold">DateText (hover for the exact timestamp)</h3>
				<span>
					short: <DateText value={AT} dateStyle="short" />
				</span>
				<span>
					medium: <DateText value={AT} />
				</span>
				<span>
					long: <DateText value={AT} dateStyle="long" />
				</span>
				<span>
					date only: <DateText value={AT} part="date" /> | time only: <DateText value={AT} part="time" />
				</span>
				<span>
					relative: <DateText value={Date.now() - 5 * 60_000} relative /> | <RelativeDate date={Date.now() + 2 * HOUR} />
				</span>
			</section>
			<section data-testid="chart">
				<h3 className="mb-1 font-semibold">Chart, time axis</h3>
				<Chart data={SERIES} xAxisKey="ts" xAxisType="time" xFormat="datetime" yFormat="number" height={180} series={[{ key: 'events', name: 'Events', type: 'line', yAxisId: 'left' }]} />
			</section>
			<section data-testid="pickers" className="flex items-start gap-4">
				<div className="w-56">
					<DatePicker value={day} onChange={setDay} />
				</div>
				<div className="w-40">
					<TimePicker value={time} onChange={setTime} />
				</div>
			</section>
		</div>
	);
}

function withSettings(change: Partial<DateSettings>): React.ComponentType {
	const formatter = createDateFormatter({ ...DEFAULT_DATE_SETTINGS, ...change });
	return function WithSettings() {
		return (
			<DateFormatProvider formatter={formatter}>
				<Showcase />
			</DateFormatProvider>
		);
	};
}

const meta: Meta = {
	title: 'Examples/Dates',
	parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj;

/** No provider: the documented default, English en-GB, 24h, the zone of the computer. */
export const NoProvider: Story = { render: () => <Showcase /> };

const FrenchParis = withSettings({ locale: 'fr-FR', timeZone: 'Europe/Paris' });
const AmericanNewYork = withSettings({ locale: 'en-US', hourCycle: '12h', timeZone: 'America/New_York' });
const IsoUtc = withSettings({ preset: 'iso', timeZone: 'UTC', weekStart: 'sunday' });
const JapaneseTokyoShowcase = withSettings({ locale: 'ja-JP', timeZone: 'Asia/Tokyo' });

export const French24hParis: Story = { render: () => <FrenchParis /> };

export const AmericanTwelveHourNewYork: Story = { render: () => <AmericanNewYork /> };

export const IsoUtcSundayFirst: Story = { render: () => <IsoUtc /> };

export const JapaneseTokyo: Story = { render: () => <JapaneseTokyoShowcase /> };
