import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTheme } from './useTheme.js';

function systemPrefersDark(dark: boolean) {
	vi.stubGlobal('matchMedia', (query: string) => ({ matches: dark && query === '(prefers-color-scheme: dark)', media: query }));
}

beforeEach(() => {
	localStorage.clear();
	document.documentElement.classList.remove('dark');
});

afterEach(() => {
	localStorage.clear();
	document.documentElement.classList.remove('dark');
});

describe('useTheme', () => {
	it('starts from the stored theme, whatever the system prefers', () => {
		systemPrefersDark(true);
		localStorage.setItem('theme', 'light');

		const { result } = renderHook(() => useTheme());

		expect(result.current.theme).toBe('light');
		expect(document.documentElement.classList.contains('dark')).toBe(false);
	});

	it('with nothing stored, follows the system preference (dark and light)', () => {
		systemPrefersDark(true);
		expect(renderHook(() => useTheme()).result.current.theme).toBe('dark');
		expect(document.documentElement.classList.contains('dark')).toBe(true);

		localStorage.clear();
		document.documentElement.classList.remove('dark');
		systemPrefersDark(false);
		expect(renderHook(() => useTheme()).result.current.theme).toBe('light');
		expect(document.documentElement.classList.contains('dark')).toBe(false);
	});

	it('setTheme switches the class on <html> and persists the choice', () => {
		systemPrefersDark(false);
		const { result } = renderHook(() => useTheme());
		expect(localStorage.getItem('theme')).toBe('light');

		act(() => result.current.setTheme('dark'));
		expect(result.current.theme).toBe('dark');
		expect(document.documentElement.classList.contains('dark')).toBe(true);
		expect(localStorage.getItem('theme')).toBe('dark');

		act(() => result.current.setTheme('light'));
		expect(document.documentElement.classList.contains('dark')).toBe(false);
		expect(localStorage.getItem('theme')).toBe('light');
	});

	it('a stored value that is not a theme is ignored with a warning naming it, and never written back', () => {
		systemPrefersDark(true);
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		localStorage.setItem('theme', 'sepia');

		const { result } = renderHook(() => useTheme());

		// Falls back to the system preference (dark here), not to a theme nobody defined.
		expect(result.current.theme).toBe('dark');
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('"sepia"'));
		expect(localStorage.getItem('theme')).toBe('dark');
	});
});
