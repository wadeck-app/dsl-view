import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FieldText } from './FieldText.js';

describe('FieldText', () => {
	it('renders label', () => {
		render(<FieldText label="Name" value="" onChange={vi.fn()} />);
		expect(screen.getByText('Name')).toBeInTheDocument();
	});

	it('the label names the input', () => {
		render(<FieldText label="Name" value="" onChange={vi.fn()} />);
		expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
	});

	it('renders description when provided', () => {
		render(<FieldText label="Name" description="Enter your full name" value="" onChange={vi.fn()} />);
		expect(screen.getByText('Enter your full name')).toBeInTheDocument();
	});

	it('displays value in input', () => {
		render(<FieldText label="Name" value="hello" onChange={vi.fn()} />);
		expect(screen.getByRole('textbox')).toHaveValue('hello');
	});

	it('calls onChange with the new string, once per edit', () => {
		const onChange = vi.fn();
		render(<FieldText label="Name" value="hello" onChange={onChange} />);
		fireEvent.change(screen.getByRole('textbox'), { target: { value: 'world' } });
		expect(onChange).toHaveBeenCalledExactlyOnceWith('world');
	});

	it('clearing the text reports an empty string, not null or undefined', () => {
		const onChange = vi.fn();
		render(<FieldText label="Name" value="hello" onChange={onChange} />);
		fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });
		expect(onChange).toHaveBeenCalledExactlyOnceWith('');
	});

	it('stays controlled: without a new value from the parent the input keeps showing the old one', () => {
		render(<FieldText label="Name" value="hello" onChange={vi.fn()} />);
		fireEvent.change(screen.getByRole('textbox'), { target: { value: 'world' } });
		expect(screen.getByRole('textbox')).toHaveValue('hello');
	});

	describe('readOnly', () => {
		it('shows the value, is marked read-only and never reports an edit', () => {
			const onChange = vi.fn();
			render(<FieldText label="Name" value="fixed" readOnly onChange={onChange} />);
			const input = screen.getByRole('textbox', { name: 'Name' });
			expect(input).toHaveValue('fixed');
			expect(input).toHaveAttribute('readonly');
			fireEvent.change(input, { target: { value: 'edited' } });
			expect(onChange).not.toHaveBeenCalled();
		});

		it('stays focusable so the value can be selected and copied (unlike disabled)', () => {
			render(<FieldText label="Name" value="fixed" readOnly onChange={vi.fn()} />);
			const input = screen.getByRole('textbox');
			input.focus();
			expect(input).toHaveFocus();
		});
	});

	describe('disabled and native attributes', () => {
		it('disabled is passed to the input, which then cannot be focused', () => {
			render(<FieldText label="Name" value="" disabled onChange={vi.fn()} />);
			expect(screen.getByRole('textbox')).toBeDisabled();
		});

		it('passes native attributes through (placeholder, maxLength, name, type)', () => {
			render(<FieldText label="Secret" value="" onChange={vi.fn()} placeholder="Type here" maxLength={5} name="secret" type="password" />);
			const input = screen.getByPlaceholderText('Type here');
			expect(input).toHaveAttribute('maxlength', '5');
			expect(input).toHaveAttribute('name', 'secret');
			expect(input).toHaveAttribute('type', 'password');
		});

		it('a consumer className is added to the base styling, not replacing it', () => {
			render(<FieldText label="Name" value="" onChange={vi.fn()} className="w-24" />);
			const classes = screen.getByRole('textbox').className.split(' ');
			expect(classes).toContain('w-24');
			expect(classes).toContain('block');
		});
	});

	describe('read-only keeps the same extras as the editable input', () => {
		it('a consumer className and native attributes also reach the read-only input', () => {
			render(<FieldText label="Name" value="fixed" readOnly onChange={vi.fn()} className="w-24" name="n" type="password" />);
			const input = screen.getByLabelText('Name');
			expect(input.className.split(' ')).toEqual(expect.arrayContaining(['w-24', 'block']));
			expect(input).toHaveAttribute('name', 'n');
			expect(input).toHaveAttribute('type', 'password');
		});

		it('switching from editable to read-only keeps the shown value and stops reporting edits', () => {
			const onChange = vi.fn();
			const { rerender } = render(<FieldText label="Name" value="same" onChange={onChange} />);
			rerender(<FieldText label="Name" value="same" readOnly onChange={onChange} />);
			const input = screen.getByRole('textbox', { name: 'Name' });
			expect(input).toHaveValue('same');
			fireEvent.change(input, { target: { value: 'edited' } });
			expect(onChange).not.toHaveBeenCalled();
		});
	});

	describe('label association', () => {
		it('a consumer-supplied id does not detach the label from the input', () => {
			render(<FieldText label="Name" value="" onChange={vi.fn()} id="custom-id" />);
			expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
		});
	});

	describe('validation wiring', () => {
		it('an error is announced and tied to the input, which is flagged invalid', () => {
			render(<FieldText label="Name" value="" onChange={vi.fn()} error="Required" />);
			const input = screen.getByRole('textbox');
			expect(screen.getByRole('alert')).toHaveTextContent('Required');
			expect(input).toHaveAttribute('aria-invalid', 'true');
			expect(input.getAttribute('aria-describedby')).toBe(screen.getByRole('alert').id);
		});

		it('without an error the input carries no invalid or describedby attribute', () => {
			render(<FieldText label="Name" value="" onChange={vi.fn()} />);
			const input = screen.getByRole('textbox');
			expect(input).not.toHaveAttribute('aria-invalid');
			expect(input).not.toHaveAttribute('aria-describedby');
		});

		it('required is exposed to assistive technology', () => {
			render(<FieldText label="Name" value="" onChange={vi.fn()} required />);
			expect(screen.getByRole('textbox')).toHaveAttribute('aria-required', 'true');
		});

		it('keeps the label and error wiring when read-only', () => {
			render(<FieldText label="Name" value="fixed" readOnly onChange={vi.fn()} error="Locked" />);
			const input = screen.getByRole('textbox', { name: 'Name' });
			expect(input).toHaveAttribute('aria-invalid', 'true');
			expect(input.getAttribute('aria-describedby')).toBe(screen.getByRole('alert').id);
		});
	});
});
