import { render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from '../controls/_Button.js';
import { ButtonContext, useButtonContext } from '../controls/buttonContext.js';
import { CardActions } from './CardActions.js';
import { NavBar } from './NavBar.js';

describe('CardActions', () => {
	it('renders children', () => {
		render(
			<CardActions>
				<button>Confirm</button>
				<button>Cancel</button>
			</CardActions>
		);
		expect(screen.getByText('Confirm')).toBeInTheDocument();
		expect(screen.getByText('Cancel')).toBeInTheDocument();
	});

	it('provides size:sm via context', () => {
		const { result } = renderHook(() => useButtonContext(), {
			wrapper: ({ children }) => <CardActions>{children}</CardActions>,
		});
		expect(result.current).toEqual({ size: 'sm' });
	});

	it('explicit size prop on child Button wins over context', () => {
		render(
			<CardActions>
				<Button size="md">Test</Button>
			</CardActions>
		);
		const btn = screen.getByRole('button', { name: 'Test' });
		expect(btn).toHaveClass('px-4', 'py-2');
		expect(btn).not.toHaveClass('py-1');
	});

	it('inner container context wins over CardActions context', () => {
		const { result } = renderHook(() => useButtonContext(), {
			wrapper: ({ children }) => (
				<CardActions>
					<NavBar>{children}</NavBar>
				</CardActions>
			),
		});
		// NavBar publishes defaultVariant:'ghost', which merges; both agree on size:'sm'
		expect(result.current.defaultVariant).toBe('ghost');
		expect(result.current.size).toBe('sm');
	});

	it('merges with outer parent context', () => {
		const { result } = renderHook(() => useButtonContext(), {
			wrapper: ({ children }) => (
				<ButtonContext.Provider value={{ defaultVariant: 'danger' }}>
					<CardActions>{children}</CardActions>
				</ButtonContext.Provider>
			),
		});
		expect(result.current).toEqual({ size: 'sm', defaultVariant: 'danger' });
	});

	it('applies custom className', () => {
		const { container } = render(<CardActions className="custom-class"><span>x</span></CardActions>);
		expect(container.firstChild).toHaveClass('custom-class');
	});
});
