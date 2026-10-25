import React from 'react';
import { reportAuthoringMistake } from '@dsl-ui/utils/devDiagnostics.js';

// Semantic content-width steps, from narrowest to widest. Raw Tailwind
// classes must never appear in DSL YAML - pages select one of these names.
export type PageContentMaxWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

// @formatter:off
const MAX_WIDTH_CLASSES: Record<PageContentMaxWidth, string> = {
	sm: 'max-w-2xl',
	md: 'max-w-4xl',
	lg: 'max-w-5xl',
	xl: 'max-w-6xl',
	'2xl': 'max-w-7xl',
	full: 'max-w-full',
};
// @formatter:on

export interface PageContentProps {
	// The full set of tags actually carried by every top-level page-section component used
	// across src/dsl/pages/*.yaml today (PageHeader, Section, Chart, DataTable, PageTabs,
	// ActionBar, Form, Stepper, VersionHistory, FileUpload, FileDropZone, FileNavigator,
	// KeyManagement, ScopeManager, ScopeTabs, HorizontalStack/Tabs). Previously stale
	// (only layout/composite, matching nothing real) - kept in sync manually until a
	// broader category tag exists (see plan Partie 5ter).
	/** @slot tag:layout, tag:composite, tag:header, tag:content, tag:chart, tag:table, tag:tabs, tag:navigation, tag:action-bar, tag:form, tag:stepper, tag:wizard, tag:upload, tag:dropzone, tag:file, tag:navigator, tag:browser, tag:keys, tag:security, tag:scopes, tag:admin, tag:management, tag:versions, tag:history */
	sections: React.ReactNode;
	/** @default 'xl' */
	maxWidth?: PageContentMaxWidth;
}

/**
 * @registryCategory disposition
 * @registryTags content
 */
export function PageContent({ sections, maxWidth = 'xl' }: PageContentProps) {
	// A width name from YAML can be mistyped; without this the class list would silently contain "undefined".
	const widthClass = MAX_WIDTH_CLASSES[maxWidth];
	if (widthClass === undefined) {
		reportAuthoringMistake(`[PageContent] unknown maxWidth "${String(maxWidth)}". Valid widths: ${Object.keys(MAX_WIDTH_CLASSES).join(', ')}. Using "xl".`, console.error);
	}
	return (
		<div className={`mx-auto w-full ${widthClass ?? MAX_WIDTH_CLASSES.xl} p-4`}>
			<div className="space-y-4">{sections}</div>
		</div>
	);
}
