import type React from 'react';
import * as LucideIcons from 'lucide-react';

/**
 * Resolves a Lucide icon component by its exported name (e.g. "Sun", "ArrowRight").
 * Returns undefined if `name` is undefined or does not match any Lucide export -
 * callers render nothing rather than throwing, since an unknown icon name is a
 * data/config problem, not a programming error worth crashing the render for.
 */
export function resolveIcon(name: string | undefined): React.ComponentType<{ className?: string }> | undefined {
	if (!name) return undefined;
	return (LucideIcons as Record<string, unknown>)[name] as React.ComponentType<{ className?: string }> | undefined;
}
