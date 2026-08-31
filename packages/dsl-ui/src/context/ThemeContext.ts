import React from 'react';

export type ThemeMode = 'light' | 'dark';

export const ThemeContext = React.createContext<{
	theme: ThemeMode;
	setTheme: (t: ThemeMode) => void;
} | null>(null);
