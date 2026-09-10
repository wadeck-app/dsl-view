import * as RadixProgress from '@radix-ui/react-progress';
import React from 'react';

export interface ProgressProps {
    value: number;
    max?: number;
    variant?: 'default' | 'success' | 'danger';
    label?: string;
    showValue?: boolean;
    size?: 'sm' | 'md';
}

const INDICATOR_CLASSES: Record<NonNullable<ProgressProps['variant']>, string> = {
    default: 'bg-[var(--color-primary-solid)]',
    success: 'bg-success',
    danger:  'bg-danger',
};

const TRACK_HEIGHT: Record<NonNullable<ProgressProps['size']>, string> = {
    sm: 'h-1.5',
    md: 'h-2.5',
};

/**
 * @registryCategory atomic
 * @registryTags progress bar loading
 */
export function Progress({ value, max = 100, variant = 'default', label, showValue = false, size = 'md' }: ProgressProps) {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));

    return (
        <div className="w-full">
            {(label || showValue) && (
                <div className="flex justify-between mb-1">
                    {label && <span className="text-sm text-content">{label}</span>}
                    {showValue && <span className="text-sm text-muted">{Math.round(pct)}%</span>}
                </div>
            )}
            <RadixProgress.Root
                value={value}
                max={max}
                className={`w-full overflow-hidden rounded-full bg-muted-bg ${TRACK_HEIGHT[size]}`}
            >
                <RadixProgress.Indicator
                    className={`h-full transition-all duration-300 ${INDICATOR_CLASSES[variant]}`}
                    style={{ width: `${pct}%` }}
                />
            </RadixProgress.Root>
        </div>
    );
}
