// Inline filters and fields in rows have no room for a visible label: `hideLabel` keeps it as the accessible name (sr-only),
// and `size="sm"` matches the 26px of ButtonAction sm.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FieldSelect } from './FieldSelect.js';
import { FieldText } from './FieldText.js';

describe('FieldText hideLabel and size', () => {
	it('hides the label visually but keeps it as the accessible name', () => {
		render(<FieldText label="Filter" value="" onChange={vi.fn()} hideLabel />);
		expect(screen.getByRole('textbox', { name: 'Filter' })).toBeInTheDocument();
		expect(screen.getByText('Filter')).toHaveClass('sr-only');
	});

	it('shows the label by default', () => {
		render(<FieldText label="Filter" value="" onChange={vi.fn()} />);
		expect(screen.getByText('Filter')).not.toHaveClass('sr-only');
	});

	it('size sm is 26px high (py-1 text-xs) and md keeps the original geometry', () => {
		const { rerender } = render(<FieldText label="F" value="" onChange={vi.fn()} size="sm" />);
		expect(screen.getByRole('textbox')).toHaveClass('py-1', 'text-xs');
		rerender(<FieldText label="F" value="" onChange={vi.fn()} />);
		expect(screen.getByRole('textbox')).toHaveClass('py-2', 'text-sm');
	});

	it('a hidden label does not leave the margin of a label above the control', () => {
		render(<FieldText label="Filter" value="" onChange={vi.fn()} hideLabel />);
		expect(screen.getByRole('textbox').className).not.toMatch(/(^|\s)mt-1(\s|$)/);
	});
});

describe('FieldSelect hideLabel and size', () => {
	const options = [{ value: 'a', label: 'A' }];

	it('hides the label visually but keeps it as the accessible name', () => {
		render(<FieldSelect label="Status" value="a" onChange={vi.fn()} options={options} hideLabel />);
		expect(screen.getByRole('combobox', { name: 'Status' })).toBeInTheDocument();
		expect(screen.getByText('Status')).toHaveClass('sr-only');
	});

	it('size sm is 26px high', () => {
		render(<FieldSelect label="Status" value="a" onChange={vi.fn()} options={options} size="sm" />);
		expect(screen.getByRole('combobox')).toHaveClass('py-1', 'text-xs');
	});
});
