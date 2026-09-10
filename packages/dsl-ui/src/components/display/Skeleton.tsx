import React from 'react';

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
