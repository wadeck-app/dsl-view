import { render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from '../controls/_Button.js';
import { ButtonContext, useButtonContext } from '../controls/buttonContext.js';
import { NavBar } from './NavBar.js';

describe('NavBar', () => {
	it('renders children', () => {
		render(
			<NavBar>
				<button>Home</button>
				<button>Settings</button>
			</NavBar>
		);
		expect(screen.getByText('Home')).toBeInTheDocument();
		expect(screen.getByText('Settings')).toBeInTheDocument();
	});

	it('provides size:sm and defaultVariant:ghost via context', () => {
		const { result } = renderHook(() => useButtonContext(), {
			wrapper: ({ children }) => <NavBar>{children}</NavBar>,
		});
		expect(result.current).toEqual({ size: 'sm', defaultVariant: 'ghost' });
	});

	it('explicit size prop on child Button wins over context', () => {
		render(
			<NavBar>
				<Button size="md">Test</Button>
			</NavBar>
		);
		const btn = screen.getByRole('button', { name: 'Test' });
		expect(btn).toHaveClass('px-4', 'py-2');
		expect(btn).not.toHaveClass('py-1');
	});

	it('inner NavBar context wins over outer parent context', () => {
		const { result } = renderHook(() => useButtonContext(), {
			wrapper: ({ children }) => (
				<ButtonContext.Provider value={{ size: 'md', defaultVariant: 'primary' }}>
					<NavBar>{children}</NavBar>
				</ButtonContext.Provider>
			),
		});
		expect(result.current).toEqual({ size: 'sm', defaultVariant: 'ghost' });
	});

	it('applies custom className', () => {
		const { container } = render(<NavBar className="custom-class"><span>x</span></NavBar>);
		expect(container.firstChild).toHaveClass('custom-class');
	});
});
