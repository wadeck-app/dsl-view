import React from 'react';

/*
 * The shimmer uses the muted-bg token, not `bg-gray-200 dark:bg-gray-700`.
 *
 * Same two colours, but a `dark:` variant keys off ANY `.dark` ancestor, so inside a ThemeScope that
 * re-asserts light within a dark app the skeleton stayed dark. Tokens inherit from the nearest scope
 * instead, which is what makes nesting work at all.
 */

export interface SkeletonProps {
    width?: string;
    height?: string;
    variant?: 'line' | 'circle' | 'block';
    count?: number;
    /**
     * Placeholder bars only: no `role="status"` / aria-label. For a parent that announces the loading state once
     * (a table with one "Loading..." status over many skeleton cells) instead of once per bar.
     */
    decorative?: boolean;
}

/**
 * @registryCategory atomic
 * @registryTags skeleton loading placeholder
 */
export function Skeleton({ width = '100%', height = '1rem', variant = 'line', count = 1, decorative = false }: SkeletonProps) {
    const isCircle = variant === 'circle';
    const resolvedHeight = isCircle ? width : height;
    // The pulse is motion: users who asked for less of it get a still placeholder.
    const barClass = `animate-pulse motion-reduce:animate-none bg-muted-bg ${isCircle ? 'rounded-full' : 'rounded'}`;
    const a11y = decorative ? { 'aria-hidden': true as const } : { role: 'status', 'aria-label': 'Loading' };

    if (count <= 1) {
        return (
            <div {...a11y}>
                <div className={barClass} style={{ width, height: resolvedHeight }} />
            </div>
        );
    }

    return (
        <div {...a11y} className="flex flex-col gap-2">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className={barClass} style={{ width, height: resolvedHeight }} />
            ))}
        </div>
    );
}
