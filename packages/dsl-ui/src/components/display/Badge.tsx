import React from 'react';

export interface BadgeProps {
    label: string;
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
    size?: 'sm' | 'md';
}

const VARIANT_CLASSES: Record<NonNullable<BadgeProps['variant']>, string> = {
    default:  'bg-muted-bg text-muted',
    primary:  'bg-primary text-white',
    success:  'bg-success text-white',
    warning:  'bg-warning-bg text-warning-text',
    danger:   'bg-danger text-white',
    info:     'bg-info-bg text-info-text',
};

const SIZE_CLASSES: Record<NonNullable<BadgeProps['size']>, string> = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
};

/**
 * @registryCategory atomic
 * @registryTags badge status
 */
export function Badge({ label, variant = 'default', size = 'sm' }: BadgeProps) {
    return (
        <span className={`inline-flex items-center rounded-full font-medium ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]}`}>
            {label}
        </span>
    );
}
