import { format } from 'date-fns';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { validDateFormat } from './validDateFormat.js';

// reportOnce keeps its memory for the page's lifetime: use a different bad format per test so each one reports.
let error: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	error = vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('validDateFormat', () => {
	it.each(['yyyy-MM-dd', 'MMM d, yyyy', "dd/MM/yyyy 'at' HH:mm", 'P'])('keeps the valid format %s without a report', (candidate) => {
		expect(validDateFormat(candidate, 'MMM d, yyyy', 'DatePicker.dateFormat')).toBe(candidate);
		expect(error).not.toHaveBeenCalled();
	});

	it('uses the fallback silently when the node declared nothing', () => {
		expect(validDateFormat(undefined, 'MMM d, yyyy', 'DatePicker.dateFormat')).toBe('MMM d, yyyy');
		expect(error).not.toHaveBeenCalled();
	});

	it('replaces a moment-style format with the fallback and reports date-fns own explanation once', () => {
		const first = validDateFormat('YYYY-MM-DD', 'MMM d, yyyy', 'DatePicker.dateFormat');
		const second = validDateFormat('YYYY-MM-DD', 'MMM d, yyyy', 'DatePicker.dateFormat');
		expect([first, second]).toStrictEqual(['MMM d, yyyy', 'MMM d, yyyy']);
		expect(error).toHaveBeenCalledTimes(1);
		const message = String(error.mock.calls[0]?.[0]);
		expect(message).toMatch(/^\[DatePicker\.dateFormat\] cannot format dates with "YYYY-MM-DD" \(Use `yyyy` instead of `YYYY`/);
		expect(message).toMatch(/using "MMM d, yyyy" instead\.$/);
	});

	it('replaces the empty format (it would print nothing even for a real date)', () => {
		expect(validDateFormat('', 'MMM d, yyyy', 'DateRangePicker.dateFormat')).toBe('MMM d, yyyy');
		expect(error).toHaveBeenCalledTimes(1);
		expect(String(error.mock.calls[0]?.[0])).toContain('the format is empty');
	});

	it('replaces a format with an unescaped latin letter that is no token (date-fns throws on it)', () => {
		expect(validDateFormat('yyyy-MM-dd hh:mm bb zzzz Q', 'MMM d, yyyy', 'DatePicker.dateFormat')).toBe('yyyy-MM-dd hh:mm bb zzzz Q');
		expect(validDateFormat('yyyy j', 'MMM d, yyyy', 'DatePicker.dateFormat')).toBe('MMM d, yyyy');
		expect(error).toHaveBeenCalledTimes(1);
	});

	it('the fallback it returns is itself accepted by date-fns', () => {
		expect(() => format(new Date(2000, 0, 1), validDateFormat('DD', 'MMM d, yyyy', 'X.dateFormat'))).not.toThrow();
	});
});
