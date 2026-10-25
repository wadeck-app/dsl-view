// A "fill" element takes the room its parent gives it instead of the height of its own content: a dashboard tile is a
// fixed box and the widget inside has to stretch to it.
//
// The three classes cover both kinds of parent, so the same string works wherever the element sits:
// - `h-full`    height: 100% - resolves against a parent whose height is definite (a tile, or another fill element);
// - `flex-1`    inside a flex parent it takes the space left by its siblings (its flex-basis wins over `h-full`);
// - `min-h-0`   a flex child defaults to `min-height: auto` and refuses to shrink below its content, so without it
//               a tall child pushes the tile open instead of being squeezed or scrolled.
//
// A static string on purpose: Tailwind finds class names by scanning source text, so a name assembled at run time
// would be purged from the consumer's CSS and the element would silently not fill.
export const FILL_CLASSES = 'h-full min-h-0 flex-1';

/** `FILL_CLASSES` when `fill` is exactly `true`, otherwise nothing: a YAML string like "yes" must not switch it on. */
export function fillClasses(fill: unknown): string {
	return fill === true ? FILL_CLASSES : '';
}

/** Joins class names, dropping empty ones. */
export function joinClasses(...parts: Array<string | false | undefined>): string {
	return parts.filter(Boolean).join(' ');
}
