import { Check } from 'lucide-react';
import React from 'react';

import { Button } from '../controls/_Button.js';

export interface ColorOption {
	value: string;
	label: string;
}

export interface ColorPickerProps {
	label: string;
	options: ColorOption[];
	value: string;
	onChange: (v: string) => void;
}

// violations-suppress-start: no-non-atomic-color-map ColorPicker color swatches are the data being displayed, not status->color mappings
const colorBgMap: Record<string, string> = {
	blue: 'bg-blue-500',
	violet: 'bg-violet-500',
	orange: 'bg-orange-500',
	green: 'bg-green-500',
	rose: 'bg-rose-500',
	teal: 'bg-teal-500',
};
// violations-suppress-end: no-non-atomic-color-map

const swatchBaseClass = 'relative flex h-9 w-9 items-center justify-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 cursor-pointer';
const swatchActiveClass = 'ring-2 ring-offset-2 ring-gray-600 dark:ring-gray-300 scale-110';
const swatchInactiveClass = 'hover:scale-105';

/**
 * @registryCategory atomic
 * @registryTags field picker
 * @registryBind formData onChange
 */
export function ColorPicker({ label, options, value, onChange }: ColorPickerProps) {
	return (
		<div>
				<p className="mb-3 text-sm text-muted">{label}</p>
			<div className="flex gap-3">
				{options.map(({ value: optValue, label: optLabel }) => {
					const isActive = value === optValue;
					// violations-suppress: no-non-atomic-color-map ColorPicker color swatches are the data being displayed, not status->color mappings
					const bg = colorBgMap[optValue] ?? 'bg-gray-500';
					return (
						<Button
							key={optValue}
							type="button"
							variant="ghost"
							onClick={() => onChange(optValue)}
							aria-label={optLabel}
							aria-pressed={isActive}
							title={optLabel}
							className={[swatchBaseClass, bg, isActive ? swatchActiveClass : swatchInactiveClass].join(' ')}
						>
							{isActive && (
								<Check className="h-4 w-4 text-white drop-shadow" />
							)}
						</Button>
					);
				})}
			</div>
		</div>
	);
}
