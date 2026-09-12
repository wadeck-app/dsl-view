import { render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from '../controls/_Button.js';
import { ButtonContext, useButtonContext } from '../controls/buttonContext.js';
import { TableRowActions } from './TableRowActions.js';

describe('TableRowActions', () => {
	it('renders children', () => {
		render(
			<TableRowActions>
				<button>Edit</button>
				<button>Delete</button>
			</TableRowActions>
		);
		expect(screen.getByText('Edit')).toBeInTheDocument();
		expect(screen.getByText('Delete')).toBeInTheDocument();
	});

	it('provides size:sm and defaultVariant:ghost via context', () => {
		const { result } = renderHook(() => useButtonContext(), {
			wrapper: ({ children }) => <TableRowActions>{children}</TableRowActions>,
		});
		expect(result.current).toEqual({ size: 'sm', defaultVariant: 'ghost' });
	});

	it('explicit size prop on child Button wins over context', () => {
		render(
			<TableRowActions>
				<Button size="md">Test</Button>
			</TableRowActions>
		);
		const btn = screen.getByRole('button', { name: 'Test' });
		expect(btn).toHaveClass('px-4', 'py-2');
		expect(btn).not.toHaveClass('py-1');
	});

	it('inner TableRowActions context wins over outer parent context', () => {
		const { result } = renderHook(() => useButtonContext(), {
			wrapper: ({ children }) => (
				<ButtonContext.Provider value={{ size: 'md', defaultVariant: 'primary' }}>
					<TableRowActions>{children}</TableRowActions>
				</ButtonContext.Provider>
			),
		});
		expect(result.current).toEqual({ size: 'sm', defaultVariant: 'ghost' });
	});

	it('applies custom className', () => {
		const { container } = render(<TableRowActions className="custom-class"><span>x</span></TableRowActions>);
		expect(container.firstChild).toHaveClass('custom-class');
	});
});
