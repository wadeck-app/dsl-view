import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { ButtonContext } from './buttonContext.js';
import { IconButton } from './IconButton.js';

describe('IconButton', () => {
	it('renders icon child', () => {
		render(<IconButton icon={<svg data-testid="test-icon" />} aria-label="Action" />);
		expect(screen.getByTestId('test-icon')).toBeInTheDocument();
	});

	it('puts aria-label on the button DOM element', () => {
		render(<IconButton icon={<span />} aria-label="Settings" />);
		expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
	});

	it('title attribute equals aria-label', () => {
		render(<IconButton icon={<span />} aria-label="Edit item" />);
		expect(screen.getByRole('button', { name: 'Edit item' })).toHaveAttribute('title', 'Edit item');
	});

	it('defaults to a ghost, 9x9 icon button', () => {
		render(<IconButton icon={<span />} aria-label="Act" />);
		const btn = screen.getByRole('button', { name: 'Act' });
		expect(btn).toHaveClass('h-9', 'w-9', 'text-muted');
		expect(btn).not.toHaveClass('bg-danger');
	});

	it('honours an explicit size and variant', () => {
		render(<IconButton icon={<span />} aria-label="Act" size="icon-xs" variant="danger" />);
		const btn = screen.getByRole('button', { name: 'Act' });
		expect(btn).toHaveClass('h-5', 'w-5', 'bg-danger');
		expect(btn).not.toHaveClass('h-9');
	});

	it('is not restyled by a container default variant or size (documented shadowing)', () => {
		render(
			<ButtonContext.Provider value={{ defaultVariant: 'danger', size: 'md' }}>
				<IconButton icon={<span />} aria-label="Act" />
			</ButtonContext.Provider>,
		);
		const btn = screen.getByRole('button', { name: 'Act' });
		expect(btn).toHaveClass('h-9', 'w-9');
		expect(btn).not.toHaveClass('bg-danger', 'px-4');
	});

	it('forwards click, and a disabled or loading button reports nothing', () => {
		const onClick = vi.fn();
		const { rerender } = render(<IconButton icon={<span />} aria-label="Act" onClick={onClick} />);
		fireEvent.click(screen.getByRole('button', { name: 'Act' }));
		expect(onClick).toHaveBeenCalledTimes(1);
		rerender(<IconButton icon={<span />} aria-label="Act" onClick={onClick} disabled />);
		fireEvent.click(screen.getByRole('button', { name: 'Act' }));
		rerender(<IconButton icon={<span />} aria-label="Act" onClick={onClick} loading />);
		fireEvent.click(screen.getByRole('button', { name: 'Act' }));
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it('an explicit title wins over the aria-label fallback', () => {
		render(<IconButton icon={<span />} aria-label="Act" title="Do the thing" />);
		expect(screen.getByRole('button', { name: 'Act' })).toHaveAttribute('title', 'Do the thing');
	});

	it('type error when aria-label is omitted (compile-time only)', () => {
		// The directive has to sit on the JSX, not on the `it(` above it: there it suppressed nothing
		// (the call is well typed) while the real error on the JSX went unreported, so this asserted
		// the opposite of what it claims. It only became visible once the tests were type-checked.
		// @ts-expect-error -- aria-label is required; omitting it must be a TypeScript error
		void (<IconButton icon={<span />} />);
	});
});
