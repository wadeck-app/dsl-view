import React from 'react';
import { render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from './_Button.js';
import { ButtonContext, useProvideButtonContext } from './buttonContext.js';

// Helper: wrap a hook call inside a provider with a given parent value.
function withParent(parentValue: React.ContextType<typeof ButtonContext>) {
	return ({ children }: { children: React.ReactNode }) => (
		<ButtonContext.Provider value={parentValue}>{children}</ButtonContext.Provider>
	);
}

describe('useProvideButtonContext', () => {
	it('merges parent and own values', () => {
		const wrapper = withParent({ size: 'sm' });
		const { result } = renderHook(() => useProvideButtonContext({ defaultVariant: 'ghost' }), { wrapper });
		expect(result.current).toEqual({ size: 'sm', defaultVariant: 'ghost' });
	});

	it('own value wins over parent for the same key (innermost wins)', () => {
		const wrapper = withParent({ size: 'sm' });
		const { result } = renderHook(() => useProvideButtonContext({ size: 'icon' }), { wrapper });
		expect(result.current).toEqual({ size: 'icon' });
	});
});

describe('Button reads ButtonContext', () => {
	it('uses context size when no explicit size prop', () => {
		render(
			<ButtonContext.Provider value={{ size: 'icon' }}>
				<Button>X</Button>
			</ButtonContext.Provider>,
		);
		const btn = screen.getByRole('button');
		expect(btn).toHaveClass('h-9', 'w-9', 'p-0');
	});

	it('uses context defaultVariant when no explicit variant prop', () => {
		render(
			<ButtonContext.Provider value={{ defaultVariant: 'ghost' }}>
				<Button>Ghost</Button>
			</ButtonContext.Provider>,
		);
		const btn = screen.getByRole('button', { name: 'Ghost' });
		// ghost variant has text-muted class
		expect(btn.className).toMatch(/text-muted/);
	});

	it('explicit size prop wins over context size', () => {
		render(
			<ButtonContext.Provider value={{ size: 'icon' }}>
				{/* sm overrides icon from context */}
				<Button size="sm">X</Button>
			</ButtonContext.Provider>,
		);
		const btn = screen.getByRole('button');
		// sm uses px-3 py-1; icon uses h-9 w-9 p-0
		expect(btn).toHaveClass('px-3', 'py-1');
		expect(btn).not.toHaveClass('h-9');
	});

	it('explicit variant prop wins over context defaultVariant', () => {
		render(
			<ButtonContext.Provider value={{ defaultVariant: 'ghost' }}>
				<Button variant="danger">Danger</Button>
			</ButtonContext.Provider>,
		);
		const btn = screen.getByRole('button', { name: 'Danger' });
		expect(btn.className).toMatch(/bg-danger/);
		// ghost class should NOT be present
		expect(btn.className).not.toMatch(/text-muted\b/);
	});
});
