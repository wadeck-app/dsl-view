import React, { useId, useState } from 'react';

import { useOptionalUrlParam } from '@dsl-ui/context/UrlParamContext.js';

import { Button } from '../controls/_Button.js';
import { nextTabIndex } from './tabKeyboard.js';

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
	/** Selected tab id. Controlled mode, together with `onChange`; ignored when `urlParam` is set. */
	activeTab?: string;
	/** Called with the clicked tab id. Ignored when `urlParam` is set. */
	onChange?: (id: string) => void;
	/**
	 * URL search param name backing the selected tab id, e.g. "tab". When set, PageTabs reads and writes it through
	 * UrlParamContext (the tab survives a reload and can be linked to) and `activeTab` / `onChange` are ignored.
	 * Without `urlParam`, `activeTab` and `onChange`, the selection is kept in the component.
	 */
	urlParam?: string;
}

/**
 * @registryCategory disposition
 * @registryTags tabs navigation
 */
export function PageTabs({ tabs, activeTab, onChange: onChangeProp, urlParam }: PageTabsProps) {
	const idBase = useId();
	const [urlTab, setUrlTab] = useOptionalUrlParam(urlParam);
	const [ownTab, setOwnTab] = useState<string | undefined>(undefined);
	// Controlled when the host passes both `activeTab` and `onChange`; otherwise the component keeps the selection.
	const controlled = activeTab !== undefined && onChangeProp !== undefined;
	// `activeTab` alone is the initial selection; once the user picks a tab, their choice wins.
	const requestedTab = urlParam ? (urlTab ?? undefined) : controlled ? activeTab : (ownTab ?? activeTab);
	const onChange = (id: string) => {
		if (urlParam) {
			setUrlTab(id);
			return;
		}
		if (!controlled) {
			setOwnTab(id);
		}
		onChangeProp?.(id);
	};
	// The tab that is both marked selected and whose content is shown: an unknown activeTab falls
	// back to the first tab for BOTH, so the selected state never disagrees with the panel.
	const activeTabDef = tabs.find(tab => tab.id === requestedTab) ?? tabs[0];
	const effectiveActiveTab = activeTabDef?.id ?? '';

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
		onChange(target.id);
		e.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
	}

	return (
		<div>
			<div role="tablist" className="flex border-b border-border mb-4">
				{tabs.map((tab, index) => {
					const isActive = tab.id === effectiveActiveTab;
					return (
						<Button
							key={tab.id}
							type="button"
							variant="chip"
							role="tab"
							id={`${idBase}-tab-${tab.id}`}
							aria-selected={isActive}
							aria-controls={`${idBase}-panel`}
							tabIndex={isActive ? 0 : -1}
							size="none"
							onClick={() => onChange(tab.id)}
							onKeyDown={e => handleKeyDown(e, index)}
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
			<div
				role="tabpanel"
				id={`${idBase}-panel`}
				aria-labelledby={activeTabDef ? `${idBase}-tab-${activeTabDef.id}` : undefined}
				className="space-y-4"
			>
				{activeTabDef?.children}
			</div>
		</div>
	);
}
