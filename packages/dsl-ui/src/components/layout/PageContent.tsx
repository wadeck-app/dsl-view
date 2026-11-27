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
	// A page section is any component: the three categories cover the whole library. This list used to name the tags of one
	// app's pages (upload, dropzone, keys...), which no component of this library carries and which blocked real pages.
	/** @slot tag:atomic, tag:composite, tag:disposition */
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
