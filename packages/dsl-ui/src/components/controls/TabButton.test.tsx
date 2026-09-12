import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import React from 'react';
import { TabButton } from './TabButton.js';

describe('TabButton', () => {
	it('renders children', () => {
		render(<TabButton>Overview</TabButton>);
		expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
	});

	it('does not have border-b-2 class when active is false', () => {
		render(<TabButton active={false}>Tab</TabButton>);
		expect(screen.getByRole('button', { name: 'Tab' })).not.toHaveClass('border-b-2');
	});

	it('does not have border-b-2 class when active is omitted', () => {
		render(<TabButton>Tab</TabButton>);
		expect(screen.getByRole('button', { name: 'Tab' })).not.toHaveClass('border-b-2');
	});

	it('has border-b-2 class when active={true}', () => {
		render(<TabButton active={true}>Tab</TabButton>);
		expect(screen.getByRole('button', { name: 'Tab' })).toHaveClass('border-b-2');
	});
});
