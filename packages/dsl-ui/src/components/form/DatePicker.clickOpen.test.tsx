// Reported on the showcase reservations page: clicking a date field showed the calendar for one frame, then it closed.
// The date input is the popover anchor, not its trigger, so Radix treats the click that focused it as a click outside.
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { FieldDate } from './FieldDate.js';

function Harness() {
	const [value, setValue] = useState<Date | null>(null);
	return <FieldDate label="From" value={value} onChange={setValue} />;
}

const today = () => screen.queryByRole('button', { name: 'Today' });

describe('DatePicker opened by a click', () => {
	it('stays open after a pointer press-release on the input (what a real mouse does)', async () => {
		render(<Harness />);
		const input = screen.getByLabelText('From');
		fireEvent.pointerDown(input, { button: 0, pointerType: 'mouse' });
		fireEvent.mouseDown(input, { button: 0 });
		act(() => input.focus());
		await act(async () => {
			await new Promise(resolve => setTimeout(resolve, 10));
		});
		fireEvent.pointerUp(input, { button: 0, pointerType: 'mouse' });
		fireEvent.mouseUp(input, { button: 0 });
		fireEvent.click(input, { button: 0 });
		expect(today()).toBeInTheDocument();
	});

	it('stays open after a user click', async () => {
		const user = userEvent.setup();
		render(<Harness />);
		await user.click(screen.getByLabelText('From'));
		expect(today()).toBeInTheDocument();
	});

	it('a second click on the input does not close it', async () => {
		const user = userEvent.setup();
		render(<Harness />);
		await user.click(screen.getByLabelText('From'));
		await user.click(screen.getByLabelText('From'));
		expect(today()).toBeInTheDocument();
	});

	it('a click elsewhere still closes it', async () => {
		const user = userEvent.setup();
		render(<><Harness /><button type="button">elsewhere</button></>);
		await user.click(screen.getByLabelText('From'));
		await user.click(screen.getByRole('button', { name: 'elsewhere' }));
		expect(today()).not.toBeInTheDocument();
	});
});

describe('two pickers', () => {
	it('opening the second closes the first', async () => {
		const user = userEvent.setup();
		render(<><Harness /><FieldDate label="To" value={null} onChange={() => undefined} /></>);
		await user.click(screen.getByLabelText('From'));
		await user.click(screen.getByLabelText('To'));
		expect(screen.getAllByRole('button', { name: 'Today' })).toHaveLength(1);
	});
});
