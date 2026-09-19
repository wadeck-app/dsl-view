import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import React from 'react';
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

	it('type error when aria-label is omitted (compile-time only)', () => {
		// The directive has to sit on the JSX, not on the `it(` above it: there it suppressed nothing
		// (the call is well typed) while the real error on the JSX went unreported, so this asserted
		// the opposite of what it claims. It only became visible once the tests were type-checked.
		// @ts-expect-error -- aria-label is required; omitting it must be a TypeScript error
		void (<IconButton icon={<span />} />);
	});
});
