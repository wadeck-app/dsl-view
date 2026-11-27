import { render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from '../controls/_Button.js';
import { ButtonContext, useButtonContext } from '../controls/buttonContext.js';
import { ActionBar } from './ActionBar.js';
import { DialogFooter } from './DialogFooter.js';

describe('ActionBar', () => {
	it('renders children', () => {
		render(
			<ActionBar>
				<button>Save</button>
				<button>Cancel</button>
			</ActionBar>
		);
		expect(screen.getByText('Save')).toBeInTheDocument();
		expect(screen.getByText('Cancel')).toBeInTheDocument();
	});

	it('provides size:sm via context', () => {
		const { result } = renderHook(() => useButtonContext(), {
			wrapper: ({ children }) => <ActionBar>{children}</ActionBar>,
		});
		expect(result.current).toMatchObject({ size: 'sm' });
	});

	it('the container owns the size: a size on a child Button is ignored', () => {
		render(
			<ActionBar>
				<Button size="md">Test</Button>
			</ActionBar>
		);
		const btn = screen.getByRole('button', { name: 'Test' });
		expect(btn).toHaveClass('px-3', 'py-1');
		expect(btn).not.toHaveClass('py-2');
	});

	it('inner container context wins over ActionBar context', () => {
		const { result } = renderHook(() => useButtonContext(), {
			wrapper: ({ children }) => (
				<ActionBar>
					<DialogFooter>{children}</DialogFooter>
				</ActionBar>
			),
		});
		// DialogFooter publishes size:'md', which wins over ActionBar's size:'sm'
		expect(result.current.size).toBe('md');
	});

	it('merges with outer parent context', () => {
		const { result } = renderHook(() => useButtonContext(), {
			wrapper: ({ children }) => (
				<ButtonContext.Provider value={{ defaultVariant: 'ghost' }}>
					<ActionBar>{children}</ActionBar>
				</ButtonContext.Provider>
			),
		});
		expect(result.current).toMatchObject({ size: 'sm', defaultVariant: 'ghost' });
	});

	it('applies custom className', () => {
		const { container } = render(<ActionBar className="custom-class"><span>x</span></ActionBar>);
		expect(container.firstChild).toHaveClass('custom-class');
	});
});
