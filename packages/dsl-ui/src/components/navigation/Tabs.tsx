import React, { useState } from 'react';

import { Button } from '../controls/_Button.js';

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

	function handleChange(key: string) {
		if (controlledValue === undefined) setInternalActive(key);
		onChange?.(key);
	}

	const activeTab = tabs.find(t => t.key === active) ?? tabs[0];

	return (
		<div>
			<div className="mb-5 flex gap-1 border-b border-border">
				{tabs.map(({ key, label }) => (
					<Button
						key={key}
						type="button"
						variant="ghost"
						onClick={() => handleChange(key)}
						className={[
							'-mb-px rounded-t border border-b-0 px-4 py-1.5 text-sm font-medium transition-colors',
							active === key
								? 'border-border bg-surface text-content'
								: 'border-transparent text-muted hover:text-content',
						].join(' ')}
					>
						{label}
					</Button>
				))}
			</div>
			<div className="space-y-4">{activeTab?.children}</div>
		</div>
	);
}
