import React from 'react';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps {
    label: string;
    variant?: BadgeVariant;
    /**
     * Visual weight. 'solid' fills with the variant colour, 'subtle' tints the background and
     * colours the text.
     *
     * The variants used to disagree: success and danger were solid while warning and info
     * were subtle, so a status set drawing on several of them rendered as heavy and light
     * pills in the same row. A caller showing a set of statuses picks one tone for all of
     * them.
     */
    tone?: 'solid' | 'subtle';
    size?: 'sm' | 'md';
}

// @formatter:off
const SOLID_CLASSES: Record<BadgeVariant, string> = {
    default:  'bg-surface border border-border text-content',
    primary:  'bg-primary text-white',
    success:  'bg-success text-white',
    // Warning has no readable solid form: white on the amber fill fails contrast, so it uses
    // its subtle pair in both tones.
    warning:  'bg-warning-bg text-warning-text border border-warning-text/20',
    danger:   'bg-danger text-white',
    info:     'bg-info-bg text-info-text',
};

const SUBTLE_CLASSES: Record<BadgeVariant, string> = {
    default:  'bg-muted-bg text-muted',
    primary:  'bg-primary-light text-primary',
    success:  'bg-success-bg text-success-text',
    warning:  'bg-warning-bg text-warning-text',
    danger:   'bg-danger-bg text-danger-text',
    info:     'bg-info-bg text-info-text',
};

const SIZE_CLASSES: Record<NonNullable<BadgeProps['size']>, string> = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
};
// @formatter:on

/**
 * @registryCategory atomic
 * @registryTags badge status
 */
export function Badge({ label, variant = 'default', tone = 'solid', size = 'sm' }: BadgeProps) {
    const variantClasses = tone === 'subtle' ? SUBTLE_CLASSES[variant] : SOLID_CLASSES[variant];
    return (
        <span className={`inline-flex items-center rounded-full font-medium ${variantClasses} ${SIZE_CLASSES[size]}`}>
            {label}
        </span>
    );
}
