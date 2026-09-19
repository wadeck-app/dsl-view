import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CompactSelect } from './CompactSelect.js';

/*
 * The gap this fills: a toolbar needs a select with no visible label, and neither existing one fits.
 * PageSizeSelect is compact and label-less but its options are numbers rendered as "N / page", locked
 * to pagination. FieldSelect takes generic options but goes through FieldWrapper, so it renders a
 * visible label and a full-width control -- wrong shape for a row of controls. Consumers therefore
 * reached for a raw <select>, which is how the orchestrator's log run selector ended up unstyled and
 * unlabelled.
 */

const OPTIONS = [
	{ value: 'a', label: 'Run A' },
	{ value: 'b', label: 'Run B' },
];

describe('rendering', () => {
	it('renders the options with their labels', () => {
		render(<CompactSelect value="a" options={OPTIONS} onChange={() => {}} ariaLabel="Run" />);
		expect(screen.getByRole('option', { name: 'Run A' })).toBeInTheDocument();
		expect(screen.getByRole('option', { name: 'Run B' })).toBeInTheDocument();
	});

	it('shows the current value as selected', () => {
		render(<CompactSelect value="b" options={OPTIONS} onChange={() => {}} ariaLabel="Run" />);
		expect(screen.getByRole('combobox')).toHaveValue('b');
	});

	/*
	 * The whole point of the component is that there is no visible label, so the accessible name has to
	 * come from somewhere. ariaLabel is a required prop for that reason -- an unnamed control is the
	 * exact defect that made three shipped date fields announce nothing.
	 */
	it('is named by ariaLabel, since it has no visible label', () => {
		render(<CompactSelect value="a" options={OPTIONS} onChange={() => {}} ariaLabel="Which run" />);
		expect(screen.getByLabelText('Which run')).toBeInTheDocument();
		expect(screen.getByRole('combobox')).toHaveAttribute('aria-label', 'Which run');
	});

	// Not `aria-label`: the entries generator skips aria-* props, so a DSL page could not set it.
	it('exposes it as a plain prop a DSL page can set', () => {
		render(<CompactSelect value="a" options={OPTIONS} onChange={() => {}} ariaLabel="Set from YAML" />);
		expect(screen.getByLabelText('Set from YAML')).toBeInTheDocument();
	});

	it('renders no visible label text', () => {
		const { container } = render(
			<CompactSelect value="a" options={OPTIONS} onChange={() => {}} ariaLabel="Which run" />,
		);
		expect(container.querySelector('label')).toBeNull();
	});

	it('takes a placeholder for the empty choice', () => {
		render(<CompactSelect value="" options={OPTIONS} onChange={() => {}} ariaLabel="Run" placeholder="All runs" />);
		expect(screen.getByRole('option', { name: 'All runs' })).toHaveValue('');
	});

	it('without a placeholder there is no empty option to pick by accident', () => {
		render(<CompactSelect value="a" options={OPTIONS} onChange={() => {}} ariaLabel="Run" />);
		expect(screen.getAllByRole('option')).toHaveLength(2);
	});

	it('can be disabled', () => {
		render(<CompactSelect value="a" options={OPTIONS} onChange={() => {}} ariaLabel="Run" disabled />);
		expect(screen.getByRole('combobox')).toBeDisabled();
	});

	it('an empty option list still renders a usable control', () => {
		render(<CompactSelect value="" options={[]} onChange={() => {}} ariaLabel="Run" />);
		expect(screen.getByRole('combobox')).toBeInTheDocument();
	});
});

describe('onChange', () => {
	it('reports the chosen value, not the event', () => {
		const onChange = vi.fn();
		render(<CompactSelect value="a" options={OPTIONS} onChange={onChange} ariaLabel="Run" />);

		fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } });

		expect(onChange).toHaveBeenCalledWith('b');
	});

	it('reports the empty value when the placeholder is chosen', () => {
		const onChange = vi.fn();
		render(<CompactSelect value="a" options={OPTIONS} onChange={onChange} ariaLabel="Run" placeholder="All runs" />);

		fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });

		expect(onChange).toHaveBeenCalledWith('');
	});
});

describe('shape', () => {
	// A toolbar puts controls in a row, so this must size to its content rather than fill the row the
	// way FieldSelect's w-full does.
	it('does not stretch to full width', () => {
		render(<CompactSelect value="a" options={OPTIONS} onChange={() => {}} ariaLabel="Run" />);
		expect(screen.getByRole('combobox').className).not.toMatch(/\bw-full\b/);
	});
});
