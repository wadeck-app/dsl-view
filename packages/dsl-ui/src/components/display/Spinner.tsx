import React from 'react';

export interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    label?: string;
}

const SIZE_PX: Record<NonNullable<SpinnerProps['size']>, number> = {
    sm: 16,
    md: 24,
    lg: 40,
};

/**
 * @registryCategory atomic
 * @registryTags loading spinner
 */
export function Spinner({ size = 'md', label }: SpinnerProps) {
    const px = SIZE_PX[size];
    return (
        <span className="inline-flex items-center gap-2">
            <svg
                role="status"
                aria-label={label ?? 'Loading...'}
                className="animate-spin text-primary"
                width={px}
                height={px}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
            </svg>
            {label && <span className="text-sm text-muted" aria-hidden="true">{label}</span>}
        </span>
    );
}
