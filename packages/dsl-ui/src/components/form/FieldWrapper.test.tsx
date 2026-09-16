import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FieldWrapper } from './FieldWrapper.js';
import { FieldText } from './FieldText.js';

describe('FieldWrapper', () => {
	it('links the label to the first child', () => {
		render(
			<FieldWrapper label="Name">
				<input />
			</FieldWrapper>
		);

		expect(screen.getByLabelText('Name')).toBeInTheDocument();
	});

	it('renders a description when given', () => {
		render(
			<FieldWrapper label="Name" description="Your full name">
				<input />
			</FieldWrapper>
		);

		expect(screen.getByText('Your full name')).toBeInTheDocument();
	});

	// Every field needs these two, so they belong here rather than being reimplemented
	// per field. A consumer that had to add them itself ended up with a whole parallel
	// copy of FieldText and FieldNumber.
	describe('required', () => {
		it('marks the label when required', () => {
			render(
				<FieldWrapper label="Name" required>
					<input />
				</FieldWrapper>
			);

			expect(screen.getByText(/Name/).textContent).toContain('*');
		});

		// The asterisk is decoration; the input carries the real signal.
		it('sets aria-required on the field rather than relying on the asterisk', () => {
			render(
				<FieldWrapper label="Name" required>
					<input />
				</FieldWrapper>
			);

			expect(screen.getByLabelText(/Name/)).toHaveAttribute('aria-required', 'true');
		});

		it('adds no marker and no aria-required when not required', () => {
			render(
				<FieldWrapper label="Name">
					<input />
				</FieldWrapper>
			);

			expect(screen.getByText('Name').textContent).not.toContain('*');
			expect(screen.getByLabelText('Name')).not.toHaveAttribute('aria-required');
		});
	});

	describe('error', () => {
		it('shows the message', () => {
			render(
				<FieldWrapper label="Name" error="Required">
					<input />
				</FieldWrapper>
			);

			expect(screen.getByText('Required')).toBeInTheDocument();
		});

		// role=alert so the message is announced when it appears after a failed submit.
		it('announces the message', () => {
			render(
				<FieldWrapper label="Name" error="Required">
					<input />
				</FieldWrapper>
			);

			expect(screen.getByRole('alert')).toHaveTextContent('Required');
		});

		it('points the field at the message and marks it invalid', () => {
			render(
				<FieldWrapper label="Name" error="Required">
					<input />
				</FieldWrapper>
			);

			const input = screen.getByLabelText('Name');
			expect(input).toHaveAttribute('aria-invalid', 'true');
			const describedBy = input.getAttribute('aria-describedby');
			expect(describedBy).toBeTruthy();
			expect(document.getElementById(describedBy!)).toHaveTextContent('Required');
		});

		it('marks nothing invalid when there is no error', () => {
			render(
				<FieldWrapper label="Name">
					<input />
				</FieldWrapper>
			);

			expect(screen.queryByRole('alert')).toBeNull();
			expect(screen.getByLabelText('Name')).not.toHaveAttribute('aria-invalid');
		});
	});

	// The point of putting this in the wrapper: fields inherit it without their own code.
	it('reaches a field built on it, without that field handling error itself', () => {
		render(<FieldText label="Command" value="" onChange={() => {}} error="Required" required />);

		expect(screen.getByRole('alert')).toHaveTextContent('Required');
		expect(screen.getByLabelText(/Command/)).toHaveAttribute('aria-invalid', 'true');
	});
});
