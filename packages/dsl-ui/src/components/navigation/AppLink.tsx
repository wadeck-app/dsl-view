import React from 'react';
import { Link as RouterLink, useInRouterContext } from 'react-router-dom';

import { reportOnce } from '../dev/reportOnce.js';
import { linkTargetProblem } from '@dsl-ui/utils/linkTarget.js';

export interface AppLinkProps {
	href: string;
	external?: boolean;
	className?: string;
	'aria-label'?: string;
	title?: string;
	onClick?: React.MouseEventHandler<HTMLAnchorElement>;
	children: React.ReactNode;
}

/**
 * Validates a link target a component was given and reports a bad one once, naming the component.
 * Returns the target when it can be used, `undefined` when it cannot: the caller then renders its
 * non-link form, so a bad target never turns into a dead or dangerous anchor.
 */
export function usableLinkTarget(href: string | undefined, external: boolean, where: string): string | undefined {
	if (href === undefined || href === '') {
		return undefined;
	}
	const problem = linkTargetProblem(href, external);
	if (problem) {
		reportOnce(`[${where}] href ignored: ${problem}.`, console.error);
		return undefined;
	}
	return href;
}

/**
 * The one anchor behind every dsl-ui link-capable element. An internal target navigates through the
 * router (no full reload) and stays a real anchor, so middle-click, open in a new tab and copy link
 * work; an external one opens in a new tab with `noopener noreferrer`. Without a router above it an
 * internal target is a plain anchor: the navigation still works, with a page load.
 */
export function AppLink({ href, external = false, className, onClick, children, ...rest }: AppLinkProps) {
	const inRouter = useInRouterContext();
	if (external) {
		return (
			<a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={onClick} {...rest}>
				{children}
			</a>
		);
	}
	if (inRouter) {
		return (
			<RouterLink to={href} className={className} onClick={onClick} {...rest}>
				{children}
			</RouterLink>
		);
	}
	return (
		<a href={href} className={className} onClick={onClick} {...rest}>
			{children}
		</a>
	);
}
