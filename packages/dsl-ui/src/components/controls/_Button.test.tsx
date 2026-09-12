import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './_Button.js';
import { ButtonContext } from './buttonContext.js';

describe('Button', () => {
	it('renders children', () => {
		render(<Button>Click me</Button>);
		expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
	});

	it('applies icon size classes', () => {
		render(<Button size="icon">X</Button>);
		expect(screen.getByRole('button')).toHaveClass('h-9', 'w-9', 'p-0');
	});

	it('applies icon-sm size classes', () => {
		render(<Button size="icon-sm">X</Button>);
		expect(screen.getByRole('button')).toHaveClass('h-7', 'w-7', 'p-0');
	});

	it('applies icon-xs size classes', () => {
		render(<Button size="icon-xs">X</Button>);
		expect(screen.getByRole('button')).toHaveClass('h-5', 'w-5', 'p-0');
	});

	it('applies link variant classes', () => {
		render(<Button variant="link">Go somewhere</Button>);
		const btn = screen.getByRole('button', { name: 'Go somewhere' });
		expect(btn).toHaveClass('px-0', 'py-0');
		expect(btn.className).toMatch(/text-primary/);
	});

	it('explicit prop wins over context (variant=danger beats defaultVariant=ghost)', () => {
		render(
			<ButtonContext.Provider value={{ defaultVariant: 'ghost' }}>
				<Button variant="danger">Danger</Button>
			</ButtonContext.Provider>,
		);
		const btn = screen.getByRole('button', { name: 'Danger' });
		expect(btn.className).toMatch(/bg-danger/);
		expect(btn.className).not.toMatch(/text-muted\b/);
	});
});
