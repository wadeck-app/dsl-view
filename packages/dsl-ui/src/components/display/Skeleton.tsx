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
}

/**
 * @registryCategory atomic
 * @registryTags skeleton loading placeholder
 */
export function Skeleton({ width = '100%', height = '1rem', variant = 'line', count = 1 }: SkeletonProps) {
    const isCircle = variant === 'circle';
    const resolvedHeight = isCircle ? width : height;

    const item = (
        <div
            className={`animate-pulse bg-muted-bg ${isCircle ? 'rounded-full' : 'rounded'}`}
            style={{ width, height: resolvedHeight }}
        />
    );

    if (count <= 1) {
        return <div role="status" aria-label="Loading">{item}</div>;
    }

    return (
        <div role="status" aria-label="Loading" className="flex flex-col gap-2">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className={`animate-pulse bg-muted-bg ${isCircle ? 'rounded-full' : 'rounded'}`}
                    style={{ width, height: resolvedHeight }}
                />
            ))}
        </div>
    );
}
