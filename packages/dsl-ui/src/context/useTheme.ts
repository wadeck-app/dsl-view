import React from 'react';

import type { ThemeMode } from './ThemeContext.js';

function systemTheme(): ThemeMode {
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// A stored value from an older build, another app on the same origin or a hand edit can be anything. Accepting it
// as a ThemeMode would apply neither theme and then write the junk back, so it is named and replaced.
function readStoredTheme(): ThemeMode {
	const stored = localStorage.getItem('theme');
	if (stored === 'light' || stored === 'dark') {
		return stored;
	}
	if (stored !== null) {
		console.warn(`[useTheme] ignoring the stored theme ${JSON.stringify(stored)} (expected "light" or "dark"); using the system preference`);
	}
	return systemTheme();
}

// Persists theme to localStorage, applies 'dark' class to <html>
export function useTheme() {
	const [theme, setTheme] = React.useState<ThemeMode>(readStoredTheme);

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
