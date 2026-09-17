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

	// @ts-expect-error -- aria-label is required; omitting it must be a TypeScript error
	it('type error when aria-label is omitted (compile-time only)', () => {
		// This test body is intentionally empty - the @ts-expect-error above is the assertion.
		void (<IconButton icon={<span />} />);
	});
});
