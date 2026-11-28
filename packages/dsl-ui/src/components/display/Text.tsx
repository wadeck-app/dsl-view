import React from 'react';

import { classFor } from '@dsl-ui/utils/warnUnknownChoice.js';

export interface TextProps {
	text: string;
	/** Colour of the text. `muted` is the secondary text of a row (a timestamp, a hint). */
	tone?: 'default' | 'muted' | 'danger' | 'success';
	/** `inherit` keeps the size of the surrounding text. */
	size?: 'inherit' | 'xs' | 'sm';
	/** Monospace: identifiers, hashes, paths, commands. */
	mono?: boolean;
}

const TONE_CLASSES: Record<NonNullable<TextProps['tone']>, string> = {
	default: 'text-content',
	muted: 'text-muted',
	danger: 'text-danger',
	success: 'text-success',
};

const SIZE_CLASSES: Record<NonNullable<TextProps['size']>, string> = {
	inherit: '',
	xs: 'text-xs',
	sm: 'text-sm',
};

/**
 * Inline run of text with a tone, a size and optionally monospace. It sits inside a sentence or next to other
 * atoms; it adds no block, no padding.
 *
 * @registryCategory atomic
 * @registryTags text muted mono code inline
 */
export function Text({ text, tone = 'default', size = 'inherit', mono = false }: TextProps) {
	const classes = [
		classFor('Text', 'tone', tone, TONE_CLASSES, 'default'),
		classFor('Text', 'size', size, SIZE_CLASSES, 'inherit'),
		mono ? 'font-mono' : '',
	]
		.filter(Boolean)
		.join(' ');
	return <span className={classes}>{text}</span>;
}
