import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

	it('exposes the active state to assistive tech, and only when active', () => {
		const { rerender } = render(<TabButton active>Tab</TabButton>);
		expect(screen.getByRole('button', { name: 'Tab' })).toHaveAttribute('aria-current', 'true');
		rerender(<TabButton active={false}>Tab</TabButton>);
		expect(screen.getByRole('button', { name: 'Tab' })).not.toHaveAttribute('aria-current');
		rerender(<TabButton>Tab</TabButton>);
		expect(screen.getByRole('button', { name: 'Tab' })).not.toHaveAttribute('aria-current');
	});

	it('an explicit aria-current from the caller wins', () => {
		render(<TabButton active aria-current="page">Tab</TabButton>);
		expect(screen.getByRole('button', { name: 'Tab' })).toHaveAttribute('aria-current', 'page');
	});

	it('forwards click and disabled like a button, and keeps its own class next to the caller className', () => {
		const onClick = vi.fn();
		const { rerender } = render(<TabButton onClick={onClick} className="extra" active>Tab</TabButton>);
		const btn = screen.getByRole('button', { name: 'Tab' });
		expect(btn).toHaveClass('extra', 'border-b-2');
		fireEvent.click(btn);
		expect(onClick).toHaveBeenCalledTimes(1);
		rerender(<TabButton onClick={onClick} disabled>Tab</TabButton>);
		fireEvent.click(screen.getByRole('button', { name: 'Tab' }));
		expect(onClick).toHaveBeenCalledTimes(1);
	});
});
