import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FieldTags } from './FieldTags.js';

describe('FieldTags', () => {
	it('renders label', () => {
		render(<FieldTags label="Keywords" value={[]} onChange={vi.fn()} />);
		expect(screen.getByText('Keywords')).toBeInTheDocument();
	});

	it('renders description when provided', () => {
		render(
			<FieldTags label="Keywords" description="Add relevant keywords" value={[]} onChange={vi.fn()} />,
		);
		expect(screen.getByText('Add relevant keywords')).toBeInTheDocument();
	});

	it('renders existing tags as pills', () => {
		render(<FieldTags label="Keywords" value={['react', 'typescript']} onChange={vi.fn()} />);
		expect(screen.getByText('react')).toBeInTheDocument();
		expect(screen.getByText('typescript')).toBeInTheDocument();
	});

	it('Enter key adds new tag', () => {
		const onChange = vi.fn();
		render(<FieldTags label="Keywords" value={[]} onChange={onChange} />);
		const input = screen.getByRole('textbox');
		fireEvent.change(input, { target: { value: 'newtag' } });
		fireEvent.keyDown(input, { key: 'Enter' });
		expect(onChange).toHaveBeenCalledWith(['newtag']);
	});

	it('comma key adds new tag', () => {
		const onChange = vi.fn();
		render(<FieldTags label="Keywords" value={[]} onChange={onChange} />);
		const input = screen.getByRole('textbox');
		fireEvent.change(input, { target: { value: 'newtag,' } });
		expect(onChange).toHaveBeenCalledWith(['newtag']);
	});

	it('Enter key does not add empty tag', () => {
		const onChange = vi.fn();
		render(<FieldTags label="Keywords" value={[]} onChange={onChange} />);
		const input = screen.getByRole('textbox');
		fireEvent.change(input, { target: { value: '   ' } });
		fireEvent.keyDown(input, { key: 'Enter' });
		expect(onChange).not.toHaveBeenCalled();
	});

	it('Enter key trims whitespace from tag', () => {
		const onChange = vi.fn();
		render(<FieldTags label="Keywords" value={[]} onChange={onChange} />);
		const input = screen.getByRole('textbox');
		fireEvent.change(input, { target: { value: '  hello  ' } });
		fireEvent.keyDown(input, { key: 'Enter' });
		expect(onChange).toHaveBeenCalledWith(['hello']);
	});

	it('clicking X on pill removes that tag', () => {
		const onChange = vi.fn();
		render(<FieldTags label="Keywords" value={['react', 'typescript']} onChange={onChange} />);
		const removeBtn = screen.getByRole('button', { name: 'Remove react' });
		fireEvent.click(removeBtn);
		expect(onChange).toHaveBeenCalledWith(['typescript']);
	});

	it('prevents duplicate tags by default', () => {
		const onChange = vi.fn();
		render(<FieldTags label="Keywords" value={['react']} onChange={onChange} />);
		const input = screen.getByRole('textbox');
		fireEvent.change(input, { target: { value: 'react' } });
		fireEvent.keyDown(input, { key: 'Enter' });
		expect(onChange).not.toHaveBeenCalled();
	});

	it('allows duplicates when allowDuplicates is true', () => {
		const onChange = vi.fn();
		render(
			<FieldTags label="Keywords" value={['react']} onChange={onChange} allowDuplicates />,
		);
		const input = screen.getByRole('textbox');
		fireEvent.change(input, { target: { value: 'react' } });
		fireEvent.keyDown(input, { key: 'Enter' });
		expect(onChange).toHaveBeenCalledWith(['react', 'react']);
	});

	it('respects maxTags limit — does not add beyond limit', () => {
		const onChange = vi.fn();
		render(
			<FieldTags label="Keywords" value={['a', 'b']} onChange={onChange} maxTags={2} />,
		);
		const input = screen.getByRole('textbox');
		expect(input).toBeDisabled();
		fireEvent.change(input, { target: { value: 'c' } });
		fireEvent.keyDown(input, { key: 'Enter' });
		expect(onChange).not.toHaveBeenCalled();
	});

	it('input is disabled once maxTags is reached', () => {
		render(
			<FieldTags label="Keywords" value={['a', 'b', 'c']} onChange={vi.fn()} maxTags={3} />,
		);
		expect(screen.getByRole('textbox')).toBeDisabled();
	});

	it('Backspace on empty input removes last tag', () => {
		const onChange = vi.fn();
		render(<FieldTags label="Keywords" value={['react', 'typescript']} onChange={onChange} />);
		const input = screen.getByRole('textbox');
		fireEvent.keyDown(input, { key: 'Backspace' });
		expect(onChange).toHaveBeenCalledWith(['react']);
	});

	it('Backspace on non-empty input does not remove last tag', () => {
		const onChange = vi.fn();
		render(<FieldTags label="Keywords" value={['react']} onChange={onChange} />);
		const input = screen.getByRole('textbox');
		fireEvent.change(input, { target: { value: 'ty' } });
		fireEvent.keyDown(input, { key: 'Backspace' });
		expect(onChange).not.toHaveBeenCalled();
	});

	it('shows error message when error prop provided', () => {
		render(
			<FieldTags label="Keywords" value={[]} onChange={vi.fn()} error="At least one tag required" />,
		);
		expect(screen.getByText('At least one tag required')).toBeInTheDocument();
	});

	it('is disabled when disabled prop is true', () => {
		render(<FieldTags label="Keywords" value={['react']} onChange={vi.fn()} disabled />);
		expect(screen.getByRole('textbox')).toBeDisabled();
	});

	it('remove buttons are hidden when disabled', () => {
		render(<FieldTags label="Keywords" value={['react']} onChange={vi.fn()} disabled />);
		expect(screen.queryByRole('button', { name: 'Remove react' })).not.toBeInTheDocument();
	});

	it('shows required indicator when required prop is true', () => {
		render(<FieldTags label="Keywords" value={[]} onChange={vi.fn()} required />);
		expect(screen.getByText('*')).toBeInTheDocument();
	});

	it('renders hidden inputs for form submission when name provided', () => {
		const { container } = render(
			<FieldTags label="Keywords" value={['react', 'ts']} onChange={vi.fn()} name="tags" />,
		);
		const hiddenInputs = container.querySelectorAll('input[type="hidden"]');
		expect(hiddenInputs).toHaveLength(2);
		expect(hiddenInputs[0]).toHaveAttribute('value', 'react');
		expect(hiddenInputs[1]).toHaveAttribute('value', 'ts');
	});
});
