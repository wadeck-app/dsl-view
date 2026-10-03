import React from 'react';

import { Button } from '../controls/_Button.js';

// Same shape as Tabs.tsx's `TabDef` (Partie 5bis.3: aligned from a map keyed by tab id onto
// an array of records with an embedded slot, so `tabs` fits the same mixed-slot-array
// geometry as Tabs.tabs/Stepper.steps).
export interface PageTabDef {
	id: string;
	label: string;
	children: React.ReactNode;
}

export interface PageTabsProps {
	tabs: PageTabDef[];
	activeTab: string;
	onChange: (id: string) => void;
}

/**
 * @registryCategory disposition
 * @registryTags tabs navigation
 */
export function PageTabs({ tabs, activeTab, onChange }: PageTabsProps) {
	const effectiveActiveTab = activeTab || tabs[0]?.id || '';
	const activeTabDef = tabs.find(tab => tab.id === effectiveActiveTab) ?? tabs[0];
	return (
		<div>
			<div className="flex border-b border-border mb-4">
				{tabs.map(tab => {
					const isActive = tab.id === effectiveActiveTab;
					return (
						<Button
							key={tab.id}
							type="button"
							variant="chip"
							role="tab"
							aria-selected={isActive}
							size="none"
							onClick={() => onChange(tab.id)}
							className={[
								'px-4 py-2 text-sm font-medium -mb-px transition-colors',
								// Only the border *colour* is set here - chip's own border-width (1px, all
								// sides) is left untouched to avoid a width collision on the same element.
								isActive
									? 'border-transparent border-b-primary text-primary'
									: 'border-transparent text-muted hover:text-content hover:border-b-border',
							].join(' ')}
						>
							{tab.label}
						</Button>
					);
				})}
			</div>
			<div className="space-y-4">{activeTabDef?.children}</div>
		</div>
	);
}
