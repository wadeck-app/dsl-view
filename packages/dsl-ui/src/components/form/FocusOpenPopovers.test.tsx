// The date picker's calendar closed when its own input was clicked again: the input is the popover anchor, not its trigger, so Radix counted
// the click as outside. Other fields that open a list on focus share the structure; a second click on the input must not close the list.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FieldAutocomplete } from './FieldAutocomplete.js';
import { FieldAsyncSelect } from './FieldAsyncSelect.js';
import { TimePicker } from './TimePicker.js';

const options = [
	{ value: 'a', label: 'Alpha' },
	{ value: 'b', label: 'Beta' },
];

describe('a second click on the input of a field that opens a list on focus', () => {
	it('FieldAutocomplete keeps its list open', async () => {
		const user = userEvent.setup();
		render(<FieldAutocomplete label="L" value="" onChange={vi.fn()} options={options} />);
		const input = screen.getByRole('combobox');
		await user.click(input);
		await screen.findByRole('listbox');
		await user.click(input);
		expect(screen.getByRole('listbox')).toBeInTheDocument();
	});

	it('FieldAsyncSelect keeps its list open', async () => {
		const user = userEvent.setup();
		render(<FieldAsyncSelect label="L" value={null} onChange={vi.fn()} loadOptions={async () => options} debounceMs={0} />);
		const input = screen.getByRole('combobox');
		await user.click(input);
		await screen.findByRole('listbox');
		await user.click(input);
		await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());
	});


	it('TimePicker toggles: a second click on its button closes the panel, it does not close and reopen it', async () => {
		const user = userEvent.setup();
		render(<TimePicker value={null} onChange={vi.fn()} />);
		const button = screen.getByRole('button', { expanded: false });
		await user.click(button);
		expect(screen.getByRole('button', { expanded: true })).toBeInTheDocument();
		await user.click(screen.getByRole('button', { expanded: true }));
		expect(screen.getByRole('button', { expanded: false })).toBeInTheDocument();
	});
});
