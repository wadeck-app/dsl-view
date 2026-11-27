import React from 'react';
import { Link } from 'react-router-dom';

import { buttonClasses } from '../controls/_Button.js';
import { Tooltip } from '../overlay/Tooltip.js';
import { reportAuthoringMistake } from '@dsl-ui/utils/devDiagnostics.js';

export interface ButtonLinkProps {
	/** Route to navigate to. */
	to: string;
	label: string;
	/** Leading icon. */
	icon?: React.ReactNode;
	variant?: 'primary' | 'secondary' | 'danger' | 'danger-outline' | 'neutral' | 'success';
	size?: 'sm' | 'md';
	/** Turns the link off: it is drawn as an off button, has no destination and takes no focus. */
	disabled?: boolean;
	/** Why the link is off; shown in its tooltip while it is. */
	disabledReason?: string;
}

/**
 * Navigation that looks like a button.
 *
 * Fills the gap that made consumers hand-roll one: a "View logs" or "Edit" action is a
 * navigation, so it must be an anchor for middle-click and copy-link to work, but it reads
 * as a button beside the real buttons. With no supported form for that, one app grew three
 * identical copies of a `px-3 py-2 ... rounded-md border` string, which then sat in the same
 * row as a `px-4 py-2 ... rounded` ButtonAction at a different width and corner radius.
 *
 * Geometry comes from buttonClasses, so this cannot drift from Button by construction.
 * Never wrap a Button in a link instead: nesting a button inside an anchor is invalid HTML
 * and gives two focus stops for one action.
 *
 * @registryCategory atomic
 * @registryTags link navigation button
 */
export function ButtonLink({ to, label, icon, variant = 'secondary', size = 'md', disabled = false, disabledReason }: ButtonLinkProps) {
	if (disabled) {
		if (!disabledReason) {
			reportAuthoringMistake(`[ButtonLink] "${label}" is off without a disabledReason: the user cannot tell why.`);
		}
		// An anchor cannot be turned off: without a destination it is a span announced as disabled.
		const off = (
			<span aria-disabled="true" className={`${buttonClasses(variant, size)} cursor-not-allowed opacity-50`}>
				{icon}
				{label}
			</span>
		);
		return disabledReason ? <Tooltip content={disabledReason}>{off}</Tooltip> : off;
	}
	return (
		<Link to={to} className={buttonClasses(variant, size)}>
			{icon}
			{label}
		</Link>
	);
}
