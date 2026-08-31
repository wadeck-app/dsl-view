import React from 'react';

import type { ThemeMode } from './ThemeContext.js';

// Persists theme to localStorage, applies 'dark' class to <html>
export function useTheme() {
	const [theme, setTheme] = React.useState<ThemeMode>(() => {
		return (
			(localStorage.getItem('theme') as ThemeMode) ??
			(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
		);
	});

	React.useEffect(() => {
		const root = document.documentElement;
		if (theme === 'dark') {
			root.classList.add('dark');
		} else {
			root.classList.remove('dark');
		}
		localStorage.setItem('theme', theme);
	}, [theme]);

	return { theme, setTheme };
}
