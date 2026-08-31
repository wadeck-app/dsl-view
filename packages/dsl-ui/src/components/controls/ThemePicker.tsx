import { Moon, Sun } from 'lucide-react';
import React from 'react';

import { Button } from './_Button.js';
import { ThemeContext, type ThemeMode } from '../../context/ThemeContext.js';

export interface ThemeOption {
	value: string;
	label: string;
	icon: string;
}

export interface ThemePickerProps {
	label: string;
	options: ThemeOption[];
	value: string;
	onChange: (v: string) => void;
}

const themeIconMap: Record<string, React.ReactNode> = {
	Sun: <Sun className="h-6 w-6" />,
	Moon: <Moon className="h-6 w-6" />,
};

/**
 * @registryCategory composite
 * @registryTags field picker
 * @registryBind formData onChange
 */
export function ThemePicker({ label, options, value, onChange }: ThemePickerProps) {
	// ThemeContext (global app theme, provided at the root by main.tsx) overrides the bound
	// formData value when present, and setTheme is called alongside onChange so the global
	// theme and the page's formData stay in sync - same internal-fallback pattern as
	// ButtonSave's useFormContext() usage, just resolved here instead of in the generator.
	const themeCtx = React.useContext(ThemeContext);
	const effectiveValue = themeCtx?.theme ?? value;
	function handleChange(v: string) {
		onChange(v);
		themeCtx?.setTheme(v as ThemeMode);
	}
	return (
		<div>
			<p className="mb-3 text-sm text-muted">{label}</p>
			<div className="flex gap-3">
				{options.map(({ value: optValue, label: optLabel, icon }) => {
					const isActive = effectiveValue === optValue;
					return (
						<Button
							key={optValue}
							type="button"
							variant="ghost"
							shape="stack"
							onClick={() => handleChange(optValue)}
							aria-pressed={isActive}
							title={optLabel}
							className={[
								'items-center rounded-lg border-2 px-6 py-4 text-sm font-medium',
								isActive
									? 'border-primary bg-primary/5 text-primary focus:ring-primary'
									: 'border-border bg-surface text-muted hover:border-border focus:ring-border',
							].join(' ')}
						>
							{themeIconMap[icon] ?? icon}
							<span>{optLabel}</span>
						</Button>
					);
				})}
			</div>
		</div>
	);
}
