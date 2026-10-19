import React, { useRef } from 'react';
import { useOpticalCenter } from '@dsl-ui/hooks/useOpticalCenter.js';

// Letters fill the tile: large font, no vertical room, and a width that follows the text (min = square).
// The one size of a tile everywhere.
const SIZE = 'h-5 min-w-[20px] px-[3px] text-[11px]';

export interface InitialsTileProps {
	/** 1 to 3 letters (see `initialsOf`). */
	text: string;
	/** Fill color (any CSS color). The text is white, so pick a color dark enough for it. */
	color: string;
}

/**
 * A small rounded tile with a few letters in white on `color` (a monogram, e.g. for a module or a workspace).
 * Decorative: hidden from assistive technology, so the name it stands for must be readable next to it.
 */
export function InitialsTile({ text, color }: InitialsTileProps): React.ReactElement {
	const inner = useRef<HTMLSpanElement>(null);
	// The text box is centered on its advance width, which leaves pairs like "BI" or "RE" visibly off-center: the
	// visible ink is measured and shifted instead (see useOpticalCenter).
	useOpticalCenter(inner, text, true, []);
	return (
		<span
			aria-hidden="true"
			data-initials={text}
			style={{ backgroundColor: color }}
			className={`grid shrink-0 place-items-center overflow-hidden rounded-md font-bold leading-none tracking-tighter text-white ${SIZE}`}
		>
			<span ref={inner} className="inline-block whitespace-nowrap">
				{text}
			</span>
		</span>
	);
}
