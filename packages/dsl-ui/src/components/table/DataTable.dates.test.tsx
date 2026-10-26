import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createDateFormatter } from '@dsl-ui/dates/dateFormatter.js';
import { DateFormatProvider } from '@dsl-ui/dates/DateFormatContext.js';
import { DEFAULT_DATE_SETTINGS } from '@dsl-ui/dates/dateSettings.js';

import { ColumnHelpers, DataTable } from './DataTable.js';

// 2026-10-24 16:38:05.123 UTC: 18:38 in Paris (CEST), 01:38 the next day in Tokyo.
const AT = '2026-10-24T16:38:05.123Z';
const dates = (change: Partial<typeof DEFAULT_DATE_SETTINGS>) => createDateFormatter({ ...DEFAULT_DATE_SETTINGS, timeZone: 'UTC', ...change });
const rows = [{ id: '1', at: AT }];

function cell() {
	return screen.getByRole('cell');
}

describe('DataTable date columns (YAML)', () => {
	it.each([
		['datetime', '24/10/2026, 16:38'],
		['date', '24/10/2026'],
		['time', '16:38'],
	])('format %s is short by default, English day-first, 24h', (format, expected) => {
		render(
			<DateFormatProvider formatter={dates({})}>
				<DataTable rows={rows as never} columns={[{ field: 'at', label: 'At', format }] as never} />
			</DateFormatProvider>,
		);
		expect(cell()).toHaveTextContent(expected);
	});

	it.each([
		['short', '24/10/2026, 16:38'],
		['medium', '24 Oct 2026, 16:38:05'],
		['long', 'Saturday, 24 October 2026 at 16:38:05 UTC'],
	])('dateStyle %s sets the length of the cell', (dateStyle, expected) => {
		render(
			<DateFormatProvider formatter={dates({})}>
				<DataTable rows={rows as never} columns={[{ field: 'at', label: 'At', format: 'datetime', dateStyle }] as never} />
			</DateFormatProvider>,
		);
		expect(cell().textContent).toMatch(new RegExp(`^${expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('Saturday,', 'Saturday,?')}$`));
	});

	it('uses the exact timestamp as the tooltip of every date cell, whatever the format and the style', () => {
		render(
			<DateFormatProvider formatter={dates({ timeZone: 'Europe/Paris' })}>
				<DataTable
					rows={[{ id: '1', a: AT, b: AT, c: AT }] as never}
					columns={[{ field: 'a', label: 'A', format: 'datetime' }, { field: 'b', label: 'B', format: 'date', dateStyle: 'long' }, { field: 'c', label: 'C', format: 'time' }] as never}
				/>
			</DateFormatProvider>,
		);
		const cells = screen.getAllByRole('cell');
		expect(cells.map(c => c.getAttribute('title'))).toEqual(Array(3).fill('2026-10-24T18:38:05.123+02:00 (Europe/Paris)'));
	});

	it('writes the cell through the provider: language, 12h clock and time zone', () => {
		render(
			<DateFormatProvider formatter={dates({ locale: 'en-US', hourCycle: '12h', timeZone: 'Asia/Tokyo' })}>
				<DataTable rows={rows as never} columns={[{ field: 'at', label: 'At', format: 'datetime' }] as never} />
			</DateFormatProvider>,
		);
		expect(cell().textContent).toMatch(/^10\/25\/2026, 01:38\sAM$/);
		expect(cell()).toHaveAttribute('title', '2026-10-25T01:38:05.123+09:00 (Asia/Tokyo)');
	});

	it('re-renders the cells when the provider changes', () => {
		const view = render(
			<DateFormatProvider formatter={dates({})}>
				<DataTable rows={rows as never} columns={[{ field: 'at', label: 'At', format: 'time' }] as never} />
			</DateFormatProvider>,
		);
		expect(cell()).toHaveTextContent('16:38');
		view.rerender(
			<DateFormatProvider formatter={dates({ timeZone: 'Asia/Tokyo' })}>
				<DataTable rows={rows as never} columns={[{ field: 'at', label: 'At', format: 'time' }] as never} />
			</DateFormatProvider>,
		);
		expect(cell()).toHaveTextContent('01:38');
	});

	it('an explicit title template wins over the exact timestamp', () => {
		render(<DataTable rows={[{ id: '1', at: AT, by: 'ally' }] as never} columns={[{ field: 'at', label: 'At', format: 'datetime', title: 'Set by {by}' }] as never} />);
		expect(cell()).toHaveAttribute('title', 'Set by ally');
	});

	it.each([[null], [undefined], ['']])('an empty value %j gives an empty cell with no tooltip', value => {
		render(<DataTable rows={[{ id: '1', at: value }] as never} columns={[{ field: 'at', label: 'At', format: 'datetime' }] as never} />);
		expect(cell().textContent).toBe('');
		expect(cell().hasAttribute('title')).toBe(false);
	});

	it('shows a value that is not a date as it came, with itself as the tooltip, and the formatter warns', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		render(<DataTable rows={[{ id: '1', at: 'whenever' }] as never} columns={[{ field: 'at', label: 'At', format: 'date' }] as never} />);
		expect(cell()).toHaveTextContent('whenever');
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('"whenever" is not a date'));
	});

	it('accepts epoch milliseconds', () => {
		render(
			<DateFormatProvider formatter={dates({})}>
				<DataTable rows={[{ id: '1', at: Date.parse(AT) }] as never} columns={[{ field: 'at', label: 'At', format: 'time' }] as never} />
			</DateFormatProvider>,
		);
		expect(cell()).toHaveTextContent('16:38');
	});

	it('has no tooltip on a column that is not a date', () => {
		render(<DataTable rows={[{ id: '1', name: 'Ally' }] as never} columns={[{ field: 'name', label: 'Name' }] as never} />);
		expect(cell().hasAttribute('title')).toBe(false);
	});

	it('says that dateStyle needs a date format, and still renders the cell', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		render(<DataTable rows={[{ id: '1', size: 2048 }] as never} columns={[{ field: 'size', label: 'Size', format: 'bytes', dateStyle: 'long' }] as never} />);
		expect(cell()).toHaveTextContent('2.0 KB');
		expect(cell().hasAttribute('title')).toBe(false);
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('column "size": dateStyle has no effect without format: datetime, date or time'));
	});

	it('names the allowed dateStyle values for an unknown one and shows the short style', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		render(
			<DateFormatProvider formatter={dates({})}>
				<DataTable rows={rows as never} columns={[{ field: 'at', label: 'At', format: 'datetime', dateStyle: 'huge' }] as never} />
			</DateFormatProvider>,
		);
		expect(cell()).toHaveTextContent('24/10/2026, 16:38');
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('unknown column "at" dateStyle "huge": using "short" instead. Allowed values: short, medium, long.'));
	});
});

describe('DataTable date columns (ColumnHelpers)', () => {
	type R = { id: string; at: string };

	it('carry the exact timestamp as their tooltip and follow the provider', () => {
		render(
			<DateFormatProvider formatter={dates({ locale: 'fr-FR', timeZone: 'Europe/Paris' })}>
				<DataTable<R> rows={rows} columns={[ColumnHelpers.date<R>('at', 'At', { format: 'time', dateStyle: 'medium' })]} />
			</DateFormatProvider>,
		);
		expect(cell()).toHaveTextContent('18:38:05');
		expect(cell()).toHaveAttribute('title', '2026-10-24T18:38:05.123+02:00 (Europe/Paris)');
	});

	it('render and cellTitle work outside a DataTable, with the documented default formatter', () => {
		const col = ColumnHelpers.date<R>('at', 'At', { format: 'date' });
		expect(col.render({ id: '1', at: '2026-10-24T12:00:00' })).toBe('24/10/2026');
		expect(col.cellTitle?.({ id: '1', at: '2026-10-24T12:00:00' })).toMatch(/^2026-10-24T12:00:00\.000/);
	});
});
