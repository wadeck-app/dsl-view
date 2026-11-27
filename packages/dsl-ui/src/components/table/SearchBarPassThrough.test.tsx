// A page that owns the search box (a "/" shortcut, Escape to clear, aria-controls on the list it filters) needs the input.
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SearchBar } from './SearchBar.js';

describe('SearchBar pass-through', () => {
	it('inputRef gives the input element, so a shortcut can focus it', () => {
		const ref = React.createRef<HTMLInputElement>();
		render(<SearchBar value="" onChange={vi.fn()} inputRef={ref} />);
		expect(ref.current).toBe(screen.getByRole('searchbox'));
		act(() => ref.current!.focus());
		expect(document.activeElement).toBe(ref.current);
	});

	it('onKeyDown receives the keys typed in the input', () => {
		const onKeyDown = vi.fn();
		render(<SearchBar value="" onChange={vi.fn()} onKeyDown={onKeyDown} />);
		fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' });
		expect(onKeyDown).toHaveBeenCalledTimes(1);
		expect(onKeyDown.mock.calls[0]![0].key).toBe('Escape');
	});

	it('ariaControls points the input at the list it filters', () => {
		render(<SearchBar value="" onChange={vi.fn()} ariaControls="results" />);
		expect(screen.getByRole('searchbox')).toHaveAttribute('aria-controls', 'results');
	});

	it('adds nothing when not given', () => {
		render(<SearchBar value="" onChange={vi.fn()} />);
		expect(screen.getByRole('searchbox')).not.toHaveAttribute('aria-controls');
	});
});
