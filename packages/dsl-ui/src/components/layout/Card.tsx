import React from 'react';

export interface CardProps {
    /** @slot tag:layout, tag:display, tag:composite */
    children: React.ReactNode;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    shadow?: boolean;
    border?: boolean;
    header?: React.ReactNode;
    footer?: React.ReactNode;
    onClick?: () => void;
}

const PADDING_CLASSES: Record<NonNullable<CardProps['padding']>, string> = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
};

/**
 * @registryCategory disposition
 * @registryTags card container surface
 */
export function Card({
    children,
    className = '',
    padding = 'md',
    shadow = true,
    border = true,
    header,
    footer,
    onClick,
}: CardProps) {
    const isClickable = onClick !== undefined;

    const base = [
        'rounded-lg bg-surface overflow-hidden',
        border ? 'border border-border' : '',
        shadow ? 'shadow-sm' : '',
        isClickable ? 'cursor-pointer hover:shadow-md transition-shadow' : '',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            className={base}
            onClick={onClick}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
        >
            {header && (
                <div className={`border-b border-border ${PADDING_CLASSES[padding]}`}>
                    {header}
                </div>
            )}
            <div className={PADDING_CLASSES[padding]}>{children}</div>
            {footer && (
                <div className={`border-t border-border ${PADDING_CLASSES[padding]}`}>
                    {footer}
                </div>
            )}
        </div>
    );
}
