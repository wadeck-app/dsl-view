import React from 'react';
import { Link } from 'react-router-dom';

import { buttonClasses } from '../controls/_Button.js';

export interface ButtonLinkProps {
	/** Route to navigate to. */
	to: string;
	label: string;
	/** Leading icon. */
	icon?: React.ReactNode;
	variant?: 'primary' | 'secondary' | 'danger' | 'danger-outline' | 'neutral' | 'success';
	size?: 'sm' | 'md';
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
export function ButtonLink({ to, label, icon, variant = 'secondary', size = 'md' }: ButtonLinkProps) {
	return (
		<Link to={to} className={buttonClasses(variant, size)}>
			{icon}
			{label}
		</Link>
	);
}
