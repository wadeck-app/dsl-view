import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CronBuilder } from './CronBuilder.js';

// Each control is exercised through what the user ends up applying: the emitted expression.
function open(value = '') {
	const onChange = vi.fn();
	render(<CronBuilder value={value} onChange={onChange} onClose={vi.fn()} />);
	return { onChange };
}

function chooseFrequency(label: string) {
	fireEvent.change(screen.getByLabelText('Frequency:'), { target: { value: label } });
}

function apply() {
	fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
}

describe('CronBuilder controls', () => {
	it('"Every N minutes" shows a number field that sets the step', () => {
		const { onChange } = open();
		expect(screen.queryByRole('spinbutton', { name: 'Every N minutes' })).toBeNull();

		chooseFrequency('every-n-min');
		fireEvent.change(screen.getByRole('spinbutton', { name: 'Every N minutes' }), { target: { value: '15' } });
		apply();

		expect(onChange).toHaveBeenCalledWith('*/15 * * * *');
	});

	it('the step field starts at the default of 10 and is limited to 1-59', () => {
		open();
		chooseFrequency('every-n-min');

		const field = screen.getByRole('spinbutton', { name: 'Every N minutes' });
		expect(field).toHaveValue(10);
		expect(field).toHaveAttribute('min', '1');
		expect(field).toHaveAttribute('max', '59');
	});

	it('monthly offers the days 1 to 28 and applies the chosen day', () => {
		const { onChange } = open();
		chooseFrequency('monthly');
		const day = screen.getByLabelText('on day') as HTMLSelectElement;
		const options = Array.from(day.options).map(option => option.value);
		expect(options).toHaveLength(28);
		expect(options[0]).toBe('1');
		expect(options[27]).toBe('28');

		fireEvent.change(day, { target: { value: '15' } });
		apply();

		expect(onChange).toHaveBeenCalledWith('0 10 15 * *');
	});

	it('the minute select offers steps of five and applies the chosen minute (hourly, daily)', () => {
		const { onChange } = open();
		chooseFrequency('hourly');
		const minute = screen.getByLabelText('at minute') as HTMLSelectElement;
		expect(Array.from(minute.options).map(option => option.textContent)).toStrictEqual(
			['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']
		);

		fireEvent.change(minute, { target: { value: '45' } });
		apply();
		expect(onChange).toHaveBeenLastCalledWith('45 * * * *');

		chooseFrequency('daily');
		apply();
		expect(onChange).toHaveBeenLastCalledWith('45 10 * * *');
	});

	it('the minute select is not offered for "every minute"', () => {
		open();
		chooseFrequency('minutely');

		expect(screen.queryByLabelText('at minute')).toBeNull();
	});

	it('weekly day chips toggle individual days, Monday first, and an empty selection falls back to Monday', () => {
		const { onChange } = open();
		chooseFrequency('weekly');

		// Defaults to Monday to Friday.
		apply();
		expect(onChange).toHaveBeenLastCalledWith('0 10 * * 1,2,3,4,5');

		fireEvent.click(screen.getByRole('button', { name: 'Fri' }));
		fireEvent.click(screen.getByRole('button', { name: 'Sat' }));
		apply();
		expect(onChange).toHaveBeenLastCalledWith('0 10 * * 1,2,3,4,6');

		for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Sat']) {
			fireEvent.click(screen.getByRole('button', { name: day }));
		}
		apply();
		expect(onChange).toHaveBeenLastCalledWith('0 10 * * 1');
	});
});
