import React, { useId, useState } from 'react';

import { Button } from '../controls/_Button.js';
import { nextTabIndex } from './tabKeyboard.js';

export interface TabDef {
	key: string;
	label: string;
	children: React.ReactNode;
}

export interface TabsProps {
	tabs: TabDef[];
	defaultTab?: string;
	value?: string;
	onChange?: (key: string) => void;
}

/**
 * @registryCategory disposition
 * @registryTags tabs layout
 */
export function Tabs({ tabs, defaultTab, value: controlledValue, onChange }: TabsProps) {
	const [internalActive, setInternalActive] = useState(defaultTab ?? tabs[0]?.key ?? '');
	const active = controlledValue ?? internalActive;
	const idBase = useId();

	function handleChange(key: string) {
		if (controlledValue === undefined) {
			setInternalActive(key);
		}
		onChange?.(key);
	}

	const activeTab = tabs.find(t => t.key === active) ?? tabs[0];

	// Arrow keys, Home and End move between tabs (roving tabindex); the focused tab is also selected.
	function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
		const next = nextTabIndex(e.key, index, tabs.length);
		if (next === null) {
			return;
		}
		e.preventDefault();
		const target = tabs[next];
		if (!target) {
			return;
		}
		handleChange(target.key);
		e.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
	}

	return (
		<div>
			<div role="tablist" className="mb-5 flex gap-1 border-b border-border">
				{tabs.map(({ key, label }, index) => (
					<Button
						key={key}
						type="button"
						role="tab"
						id={`${idBase}-tab-${key}`}
						aria-selected={activeTab?.key === key}
						aria-controls={`${idBase}-panel`}
						tabIndex={activeTab?.key === key ? 0 : -1}
						variant="chip"
						size="none"
						onClick={() => handleChange(key)}
						onKeyDown={e => handleKeyDown(e, index)}
						className={[
							'-mb-px px-4 py-1.5 text-sm font-medium transition-colors',
							// Only the border *colour* is set here - chip's own border-width (1px, all
							// sides) is left untouched to avoid a width collision on the same element.
							activeTab?.key === key
								? 'border-transparent border-b-primary text-primary'
								: 'border-transparent text-muted hover:text-content hover:border-b-border',
						].join(' ')}
					>
						{label}
					</Button>
				))}
			</div>
			<div
				role="tabpanel"
				id={`${idBase}-panel`}
				aria-labelledby={activeTab ? `${idBase}-tab-${activeTab.key}` : undefined}
				className="space-y-4"
			>
				{activeTab?.children}
			</div>
		</div>
	);
}
