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

// Reported from a real screen: "Run now", "View logs", "Edit" and "Delete" sat in one row
// at three different heights. Two of those three came from here - secondary and
// danger-outline add a 1px border while primary, danger, neutral, success and ghost do
// not, so at the same size a bordered variant is 2px taller than an unbordered one.
// Variants choose colour, never geometry.
describe('Button geometry is variant-independent', () => {
	const bordered = ['secondary', 'danger-outline'] as const;
	const unbordered = ['primary', 'danger', 'neutral', 'success', 'ghost'] as const;

	it.each([...bordered, ...unbordered])('%s reserves the same border width', variant => {
		const { container } = render(<Button variant={variant}>Label</Button>);

		const cls = (container.firstElementChild as HTMLElement).className;
		// Either a visible border or a transparent one, but always a border box of 1px, so
		// the outer height does not depend on which variant was picked.
		expect(cls).toMatch(/\bborder\b/);
	});

	it('gives every variant an identical class-level box at one size', () => {
		const boxOf = (variant: string) => {
			const { container } = render(<Button variant={variant as 'primary'} size="md">Label</Button>);
			const cls = (container.firstElementChild as HTMLElement).className;
			// Only the parts that affect height: padding, font size, border width.
			return cls.split(' ').filter(c => /^(px|py|text-(xs|sm|base)|border)$|^(px|py)-|^border$/.test(c)).sort().join(' ');
		};

		const boxes = new Set([...bordered, ...unbordered].map(boxOf));
		expect([...boxes]).toHaveLength(1);
	});
});

// A trailing icon button beside a form field has to be the same height as the field, or the
// pair reads as misaligned. The field controls are py-2 text-sm with a border, i.e. 38px,
// and the icon sizes were 36/28/20 - none of them matched, so a consumer bottom-aligned a
// 36px button against a 38px input and the top edges disagreed by 2px.
describe('icon-field size', () => {
	it('is offered as a size', () => {
		const { container } = render(<Button size="icon-field">x</Button>);

		expect((container.firstElementChild as HTMLElement).className).toMatch(/h-\[2\.375rem\]/);
	});

	it('is square, like the other icon sizes', () => {
		const { container } = render(<Button size="icon-field">x</Button>);

		const cls = (container.firstElementChild as HTMLElement).className;
		expect(cls).toMatch(/w-\[2\.375rem\]/);
	});

	// 2.375rem is 38px: py-2 (8+8) + text-sm line-height (20) + border (1+1).
	it('matches the height a Field* control renders at', () => {
		const { container } = render(<Button size="icon-field">x</Button>);

		expect((container.firstElementChild as HTMLElement).className).toContain('h-[2.375rem]');
	});
});
