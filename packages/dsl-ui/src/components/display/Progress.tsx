import * as RadixProgress from '@radix-ui/react-progress';
import React from 'react';

export interface ProgressProps {
    value: number;
    max?: number;
    variant?: 'default' | 'success' | 'danger';
    label?: string;
    showValue?: boolean;
    size?: 'sm' | 'md';
    /**
     * 'stacked' (default) fills its container and puts the label above the bar.
     *
     * 'inline' keeps label, bar and value on one line with a bounded bar, for a dense row
     * where a full-width block does not fit. A consumer skipped this component and left a bare
     * percentage as text because there was no such form.
     */
    layout?: 'stacked' | 'inline';
    /**
     * Exact text for the value, replacing the rounded percentage.
     *
     * Rounding hides the precision that makes a number worth showing: 99.94% availability is
     * not 100%.
     */
    valueLabel?: string;
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

// Bounded rather than w-full: an inline bar shares its row, so it cannot claim all of it.
const TRACK_WIDTH: Record<NonNullable<ProgressProps['layout']>, string> = {
    stacked: 'w-full',
    inline: 'w-16',
};

/**
 * @registryCategory atomic
 * @registryTags progress bar loading
 */
export function Progress({
    value,
    max = 100,
    variant = 'default',
    label,
    showValue = false,
    size = 'md',
    layout = 'stacked',
    valueLabel,
}: ProgressProps) {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));
    const shownValue = valueLabel ?? `${Math.round(pct)}%`;
    const isInline = layout === 'inline';

    const track = (
        <RadixProgress.Root
            value={value}
            max={max}
            className={`${TRACK_WIDTH[layout]} overflow-hidden rounded-full bg-muted-bg ${TRACK_HEIGHT[size]}`}
        >
            <RadixProgress.Indicator
                className={`h-full transition-all duration-300 ${INDICATOR_CLASSES[variant]}`}
                style={{ width: `${pct}%` }}
            />
        </RadixProgress.Root>
    );

    if (isInline) {
        // Text sized with the bar: a dense row uses text-xs, and md keeps text-sm.
        const textCls = size === 'sm' ? 'text-xs' : 'text-sm';
        return (
            <div className="flex items-center gap-2">
                {label && <span className={`${textCls} text-content`}>{label}</span>}
                {track}
                {showValue && <span className={`${textCls} text-muted`}>{shownValue}</span>}
            </div>
        );
    }

    return (
        <div className="w-full">
            {(label || showValue) && (
                <div className="flex justify-between mb-1">
                    {label && <span className="text-sm text-content">{label}</span>}
                    {showValue && <span className="text-sm text-muted">{shownValue}</span>}
                </div>
            )}
            {track}
        </div>
    );
}
