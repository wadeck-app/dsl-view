import type React from 'react';
import * as LucideIcons from 'lucide-react';

/**
 * Resolves a Lucide icon component by its exported name (e.g. "Sun", "ArrowRight").
 * Returns undefined if `name` is undefined or does not match any Lucide icon -
 * callers render nothing rather than throwing, since an unknown icon name is a
 * data/config problem, not a programming error worth crashing the render for.
 *
 * Only PascalCase component exports count: lucide-react also exports helpers (`icons`, `createLucideIcon`),
 * and a YAML `icon: icons` must not hand a plain object to React as if it were a component.
 */
export function resolveIcon(name: string | undefined): React.ComponentType<{ className?: string }> | undefined {
	if (!name || !/^[A-Z]/.test(name)) {
		return undefined;
	}
	// violations-suppress: ts/no-unsafe-type-cast LucideIcons has a wide union type; string-indexing requires intermediate Record cast
	const candidate = (LucideIcons as Record<string, unknown>)[name];
	const isComponent = typeof candidate === 'function' || (typeof candidate === 'object' && candidate !== null && '$$typeof' in candidate);
	return isComponent ? (candidate as React.ComponentType<{ className?: string }>) : undefined;
}
