import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatePicker } from './DatePicker.js';
import { DateRangePicker } from './DateRangePicker.js';

// date-fns throws on a moment-style or empty format; the pickers format their value on every render, so one such
// `dateFormat` in a page used to take the whole page down. They must fall back and say why.
let error: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
	error = vi.spyOn(console, 'error').mockImplementation(() => {});
});

const date = new Date(2024, 0, 15);

describe('DatePicker dateFormat', () => {
	it('shows the date in the declared date-fns format', () => {
		render(<DatePicker value={date} onChange={vi.fn()} dateFormat="yyyy-MM-dd" />);
		expect(screen.getByRole('textbox')).toHaveValue('2024-01-15');
		expect(error).not.toHaveBeenCalled();
	});

	it.each([['YYYY-MM-DD'], ['dd/MM/YYYY'], ['']])('falls back to the default format for %j, and reports it', (dateFormat) => {
		render(<DatePicker value={date} onChange={vi.fn()} dateFormat={dateFormat} />);
		expect(screen.getByRole('textbox')).toHaveValue('Jan 15, 2024');
		expect(error).toHaveBeenCalledTimes(1);
		expect(String(error.mock.calls[0]?.[0])).toMatch(new RegExp(`^\\[DatePicker\\.dateFormat\\] cannot format dates with ${JSON.stringify(dateFormat).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
	});
});

describe('DateRangePicker dateFormat', () => {
	it('shows the range in the declared date-fns format', () => {
		render(<DateRangePicker value={{ from: date, to: new Date(2024, 0, 20) }} onChange={vi.fn()} dateFormat="yyyy-MM-dd" />);
		expect(screen.getByRole('button', { name: /2024-01-15 \u2013 2024-01-20/ })).toBeInTheDocument();
		expect(error).not.toHaveBeenCalled();
	});

	it.each([['YYYY-MM-DD'], ['']])('falls back to the default format for %j, and reports it', (dateFormat) => {
		render(<DateRangePicker value={{ from: date, to: new Date(2024, 0, 20) }} onChange={vi.fn()} dateFormat={dateFormat} />);
		expect(screen.getByRole('button', { name: /Jan 15, 2024 \u2013 Jan 20, 2024/ })).toBeInTheDocument();
		expect(error).toHaveBeenCalledTimes(1);
		expect(String(error.mock.calls[0]?.[0])).toContain('[DateRangePicker.dateFormat] cannot format dates with');
	});
});
