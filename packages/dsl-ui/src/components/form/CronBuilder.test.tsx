import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CronBuilder } from './CronBuilder.js';

// buildCron and parseCronToSpec are covered in cron-spec.test.ts, where they live.

function open(value = '') {
	const onChange = vi.fn();
	const onClose = vi.fn();
	render(<CronBuilder value={value} onChange={onChange} onClose={onClose} />);
	return { onChange, onClose };
}

function hour(h: number): HTMLElement {
	return screen.getByRole('button', { name: `${String(h).padStart(2, '0')} hours` });
}

function apply(): void {
	fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
}

describe('CronBuilder', () => {
	it('previews the expression for the default frequency', () => {
		open();
		expect(screen.getByText('0 10 * * *')).toBeInTheDocument();
	});

	it('updates the preview when the frequency changes', () => {
		open();
		fireEvent.change(screen.getByLabelText('Frequency:'), { target: { value: 'minutely' } });
		expect(screen.getByText('* * * * *')).toBeInTheDocument();
	});

	// The preview is not the value: nothing is emitted until Apply, so a user can explore
	// frequencies without overwriting the field behind the wizard.
	it('emits nothing until Apply is pressed', () => {
		const { onChange } = open();

		fireEvent.change(screen.getByLabelText('Frequency:'), { target: { value: 'hourly' } });
		expect(onChange).not.toHaveBeenCalled();

		apply();
		expect(onChange).toHaveBeenCalledWith('0 * * * *');
	});

	it('closes without emitting on Cancel', () => {
		const { onChange, onClose } = open();

		fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

		expect(onClose).toHaveBeenCalled();
		expect(onChange).not.toHaveBeenCalled();
	});

	it('offers day chips only for the specific-days frequency', () => {
		open();
		expect(screen.queryByText('Mon')).toBeNull();

		fireEvent.change(screen.getByLabelText('Frequency:'), { target: { value: 'weekly' } });

		expect(screen.getByText('Mon')).toBeInTheDocument();
		expect(screen.getByText('Sun')).toBeInTheDocument();
	});

	// Regression guard for the promotion into dsl-ui: the original was a pair of native button
	// elements styled with the consuming app's --color-on-primary and --color-primary-hover, which
	// are not design-system tokens and would have left Apply unstyled here.
	it('styles its actions from the design system, not a consumer palette', () => {
		open();

		const applyBtn = screen.getByRole('button', { name: 'Apply' });
		expect(applyBtn.className).not.toContain('on-primary');
		expect(applyBtn.className).not.toContain('bg-primary-hover');
		expect(applyBtn.className).toContain('--color-primary-solid');
	});
});

/*
 * The reported gap: a job can fire several times a day, and the wizard could only describe one
 * hour. Applying it to `10 10,19 * * *` silently dropped the evening run.
 */
describe('CronBuilder with several firing hours', () => {
	it('lets more than one hour be selected and emits both', () => {
		const { onChange } = open('0 10 * * *');

		fireEvent.click(hour(19));
		apply();

		expect(onChange).toHaveBeenCalledWith('0 10,19 * * *');
	});

	it('shows how many hours are selected', () => {
		open('0 10 * * *');
		expect(screen.getByText(/1 selected/)).toBeInTheDocument();

		fireEvent.click(hour(19));
		expect(screen.getByText(/2 selected/)).toBeInTheDocument();
	});

	it('unselects an hour that is already on', () => {
		const { onChange } = open('0 10,19 * * *');

		fireEvent.click(hour(19));
		apply();

		expect(onChange).toHaveBeenCalledWith('0 10 * * *');
	});

	// Substituting midnight for an empty selection would move the job without saying so.
	it('refuses to unselect the last hour', () => {
		const { onChange } = open('0 10 * * *');

		fireEvent.click(hour(10));
		apply();

		expect(onChange).toHaveBeenCalledWith('0 10 * * *');
		expect(screen.getByText(/1 selected/)).toBeInTheDocument();
	});

	it('offers no hour grid for frequencies that do not use one', () => {
		open();
		expect(hour(10)).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText('Frequency:'), { target: { value: 'hourly' } });

		expect(screen.queryByRole('button', { name: '10 hours' })).toBeNull();
	});
});

/*
 * `value` was declared and never read: the wizard always opened on its own defaults, so opening it
 * on an existing schedule and pressing Apply replaced that schedule rather than editing it.
 */
describe('CronBuilder opens on the expression it is given', () => {
	it('preselects the hours from the current value', () => {
		open('10 10,19 * * *');

		expect(screen.getByText('10 10,19 * * *')).toBeInTheDocument();
		expect(screen.getByText(/2 selected/)).toBeInTheDocument();
	});

	it('applies an untouched value unchanged', () => {
		const { onChange } = open('10 10,19 * * *');

		apply();

		expect(onChange).toHaveBeenCalledWith('10 10,19 * * *');
	});

	it('preselects the frequency and the days', () => {
		open('30 9 * * 1,3,5');

		expect(screen.getByText('30 9 * * 1,3,5')).toBeInTheDocument();
		expect(screen.getByText('Mon')).toBeInTheDocument();
	});

	it('preselects a monthly day', () => {
		open('0 8 15 * *');
		expect(screen.getByText('0 8 15 * *')).toBeInTheDocument();
	});

	// An expression the wizard cannot describe must not be half-adopted.
	it('falls back to its defaults for an expression it cannot express', () => {
		open('0 */2 * * *');
		expect(screen.getByText('0 10 * * *')).toBeInTheDocument();
	});
});

// It used to be filled with bg-muted-bg, the hover/muted token, which read as a flat grey slab
// rather than a surface floating over the form.
describe('CronBuilder panel surface', () => {
	it('uses the surface token with a border and a shadow, not the muted fill', () => {
		const { container } = render(<CronBuilder value="" onChange={() => {}} onClose={() => {}} />);
		const panel = container.firstElementChild as HTMLElement;

		expect(panel.className).toContain('bg-surface');
		expect(panel.className).toContain('border-border');
		expect(panel.className).toContain('shadow-md');
		expect(panel.className).not.toContain('bg-muted-bg');
	});
});
