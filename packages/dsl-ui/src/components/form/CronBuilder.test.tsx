import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CronBuilder, buildCron } from './CronBuilder.js';

describe('buildCron', () => {
	it.each([
		['minutely',    '* * * * *'],
		['hourly',      '30 * * * *'],
		['daily',       '30 9 * * *'],
		['weekdays',    '30 9 * * 1-5'],
		['monthly',     '30 9 15 * *'],
	] as const)('builds %s as %s', (freq, expected) => {
		expect(buildCron(freq, 10, 9, 30, 15, [true, false, false, false, false, false, false])).toBe(expected);
	});

	it('builds an every-N-minutes step', () => {
		expect(buildCron('every-n-min', 5, 9, 30, 1, [])).toBe('*/5 * * * *');
	});

	// Cron day-of-week is 1 for Monday here, so the array index shifts by one.
	it('maps ticked weekdays onto 1-based cron day numbers', () => {
		const monWedFri = [true, false, true, false, true, false, false];
		expect(buildCron('weekly', 10, 9, 30, 1, monWedFri)).toBe('30 9 * * 1,3,5');
	});

	// An empty day-of-week field is not a valid expression, so it has to fall back.
	it('falls back to Monday when no day is ticked', () => {
		expect(buildCron('weekly', 10, 9, 30, 1, [false, false, false, false, false, false, false]))
			.toBe('30 9 * * 1');
	});
});

describe('CronBuilder', () => {
	it('previews the expression for the default frequency', () => {
		render(<CronBuilder value="" onChange={() => {}} onClose={() => {}} />);

		// Defaults: daily at 10:00.
		expect(screen.getByText('0 10 * * *')).toBeInTheDocument();
	});

	it('updates the preview when the frequency changes', () => {
		render(<CronBuilder value="" onChange={() => {}} onClose={() => {}} />);

		fireEvent.change(screen.getByLabelText('Frequency:'), { target: { value: 'minutely' } });

		expect(screen.getByText('* * * * *')).toBeInTheDocument();
	});

	// The preview is not the value: nothing is emitted until Apply, so a user can explore
	// frequencies without overwriting the field behind the wizard.
	it('emits nothing until Apply is pressed', () => {
		const onChange = vi.fn();
		render(<CronBuilder value="" onChange={onChange} onClose={() => {}} />);

		fireEvent.change(screen.getByLabelText('Frequency:'), { target: { value: 'hourly' } });
		expect(onChange).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
		expect(onChange).toHaveBeenCalledWith('0 * * * *');
	});

	it('closes without emitting on Cancel', () => {
		const onChange = vi.fn();
		const onClose = vi.fn();
		render(<CronBuilder value="" onChange={onChange} onClose={onClose} />);

		fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

		expect(onClose).toHaveBeenCalled();
		expect(onChange).not.toHaveBeenCalled();
	});

	it('offers day chips only for the specific-days frequency', () => {
		render(<CronBuilder value="" onChange={() => {}} onClose={() => {}} />);
		expect(screen.queryByText('Mon')).toBeNull();

		fireEvent.change(screen.getByLabelText('Frequency:'), { target: { value: 'weekly' } });

		expect(screen.getByText('Mon')).toBeInTheDocument();
		expect(screen.getByText('Sun')).toBeInTheDocument();
	});

	// Regression guard for the promotion into dsl-ui: the original was a raw <button> pair
	// styled with the consuming app's --color-on-primary and --color-primary-hover, which
	// are not design-system tokens and would have left Apply unstyled here.
	it('styles its actions from the design system, not a consumer palette', () => {
		render(<CronBuilder value="" onChange={() => {}} onClose={() => {}} />);

		const apply = screen.getByRole('button', { name: 'Apply' });
		expect(apply.className).not.toContain('on-primary');
		expect(apply.className).not.toContain('bg-primary-hover');
		// Comes from _Button's primary variant, which resolves the shared token.
		expect(apply.className).toContain('--color-primary-solid');
	});
});
