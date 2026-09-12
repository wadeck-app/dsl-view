import { render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from '../controls/_Button.js';
import { ButtonContext, useButtonContext } from '../controls/buttonContext.js';
import { DialogFooter } from './DialogFooter.js';

describe('DialogFooter', () => {
	it('renders children', () => {
		render(
			<DialogFooter>
				<button>Confirm</button>
				<button>Cancel</button>
			</DialogFooter>
		);
		expect(screen.getByText('Confirm')).toBeInTheDocument();
		expect(screen.getByText('Cancel')).toBeInTheDocument();
	});

	it('provides size:md via context', () => {
		const { result } = renderHook(() => useButtonContext(), {
			wrapper: ({ children }) => <DialogFooter>{children}</DialogFooter>,
		});
		expect(result.current).toEqual({ size: 'md' });
	});

	it('explicit size prop on child Button wins over context', () => {
		render(
			<DialogFooter>
				<Button size="sm">Test</Button>
			</DialogFooter>
		);
		const btn = screen.getByRole('button', { name: 'Test' });
		expect(btn).toHaveClass('px-3', 'py-1');
		expect(btn).not.toHaveClass('py-2');
	});

	it('inner DialogFooter context wins over outer parent context', () => {
		const { result } = renderHook(() => useButtonContext(), {
			wrapper: ({ children }) => (
				<ButtonContext.Provider value={{ size: 'sm', defaultVariant: 'ghost' }}>
					<DialogFooter>{children}</DialogFooter>
				</ButtonContext.Provider>
			),
		});
		// DialogFooter's size:'md' wins over outer size:'sm'; defaultVariant merges from parent
		expect(result.current.size).toBe('md');
		expect(result.current.defaultVariant).toBe('ghost');
	});

	it('applies custom className', () => {
		const { container } = render(<DialogFooter className="custom-class"><span>x</span></DialogFooter>);
		expect(container.firstChild).toHaveClass('custom-class');
	});
});
