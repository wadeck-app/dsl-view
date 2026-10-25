import React from 'react';

import { reportAuthoringMistake } from '@dsl-ui/utils/devDiagnostics.js';
import { PageSection as RealPageSection } from './PageSection.js';
import type { PageSectionProps } from './PageSection.js';

export type { PageSectionProps };

/**
 * Compatibility path only. This file was named `PageHeader.tsx` although it holds `PageSection` (the registry's
 * `PageHeader` is `display/PageHeader`). Generated entries committed by consumers before the rename deep-import
 * `dist/components/layout/PageHeader.js`; keep this so they still build. No `@registryCategory` here on purpose:
 * the registry entry is `layout/PageSection`.
 *
 * @deprecated import from `layout/PageSection.js` (regenerate `src/generated/entries.tsx`).
 */
export function PageSection(props: PageSectionProps) {
	reportAuthoringMistake(
		'[PageSection] imported from "dsl-ui/dist/components/layout/PageHeader.js", a deprecated path: regenerate src/generated/entries.tsx (it now imports "layout/PageSection.js"). This path will be removed.',
	);
	return <RealPageSection {...props} />;
}
