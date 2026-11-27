import React from 'react';

import { iconComponentByName } from './iconByName.js';
import type { IconComponent, IconName } from './iconByName.js';
import { HeaderActions, useHasHeaderActionsSlot } from '../layout/HeaderActions.js';
import { reportAuthoringMistake } from '@dsl-ui/utils/devDiagnostics.js';

export interface PageHeaderProps {
	title: string;
	subtitle?: string;
	/** Icon to render left of the title (compact mode, text-lg): a Lucide component, or an icon name when written in YAML (see iconByName). */
	icon?: IconComponent | IconName;
	// Actions rendered to the right of the title (e.g. a button). ButtonAction carries
	// tag:action in addition to tag:button - both must be allowed here.
	/** @slot tag:button, tag:action */
	headerActions?: React.ReactNode;
	/** 'sm' = section-level header (text-base font-semibold, no margin). Default = page-level (text-2xl). */
	size?: 'default' | 'sm';
	/** 'page' (default) renders in the page. 'trail' moves the whole header into the host's HeaderActionsSlot as one row; without a slot it renders in the page. */
	placement?: 'page' | 'trail';
}

// Each layout renders only some of the props. Dropping the others silently hides authoring mistakes, so say so once.
function warnIgnored(layout: string, ignored: string[]): void {
	if (ignored.length > 0) {
		reportAuthoringMistake(`[PageHeader] ${layout} does not render ${ignored.join(', ')}: it is ignored.`);
	}
}

/**
 * @registryCategory composite
 * @registryTags header
 */
export function PageHeader({ placement = 'page', ...props }: PageHeaderProps) {
	const hasSlot = useHasHeaderActionsSlot();
	if (placement === 'trail' && hasSlot && props.size !== 'sm') {
		return (
			<HeaderActions>
				<TrailRow {...props} />
			</HeaderActions>
		);
	}
	return <InPlaceHeader {...props} />;
}

// One flex row: icon, the h1, the subtitle, then the actions pushed to the end. No margins: the host owns the spacing.
function TrailRow({ title, subtitle, icon, headerActions }: PageHeaderProps) {
	const Icon = resolveHeaderIcon(icon);
	return (
		<div className="flex min-w-0 flex-1 items-center gap-2">
			{Icon && <Icon className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />}
			<h1 className="truncate text-lg font-semibold text-content">{title}</h1>
			{subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
			{headerActions && <div className="ml-auto flex items-center gap-2">{headerActions}</div>}
		</div>
	);
}

function InPlaceHeader({ title, subtitle, icon, headerActions, size = 'default' }: PageHeaderProps) {
	const Icon = resolveHeaderIcon(icon);
	if (size === 'sm') {
		warnIgnored('size "sm"', [Icon && 'icon', subtitle && 'subtitle', headerActions && 'headerActions'].filter((x): x is string => Boolean(x)));
		return <h2 className="text-base font-semibold text-content">{title}</h2>;
	}
	if (Icon) {
		warnIgnored('an icon header', headerActions ? ['headerActions'] : []);
		return (
			<div className="mb-3 flex items-center gap-2">
				<Icon className="h-5 w-5 text-muted" aria-hidden="true" />
				<h1 className="text-lg font-semibold text-content">{title}</h1>
				{subtitle && <p className="text-sm text-muted">{subtitle}</p>}
			</div>
		);
	}
	if (headerActions) {
		warnIgnored('a header with headerActions', subtitle ? ['subtitle'] : []);
		return (
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-semibold text-content">{title}</h1>
				<div>{headerActions}</div>
			</div>
		);
	}
	return (
		<>
			<h1 className="mb-2 text-2xl font-semibold text-content">{title}</h1>
			{subtitle && <p className="mb-6 text-sm text-muted">{subtitle}</p>}
		</>
	);
}

// React component types are functions, or objects tagged with $$typeof (memo, forwardRef, Lucide icons).
function isComponentType(value: unknown): value is IconComponent {
	return typeof value === 'function' || (typeof value === 'object' && value !== null && '$$typeof' in value);
}

// A TSX caller passes a component; a YAML node can only pass an icon name. Anything else (a map from a source that has
// not loaded, a number) used to reach React as an invalid element type and crash the page.
function resolveHeaderIcon(icon: unknown): IconComponent | undefined {
	if (icon === undefined || icon === null || icon === '') {
		return undefined;
	}
	if (typeof icon === 'string') {
		return iconComponentByName(icon, 'PageHeader.icon');
	}
	if (isComponentType(icon)) {
		return icon;
	}
	reportAuthoringMistake(`[PageHeader] icon expects an icon name or an icon component but received ${Array.isArray(icon) ? 'a list' : typeof icon === 'object' ? 'a map' : typeof icon}: no icon is shown.`, console.error);
	return undefined;
}
