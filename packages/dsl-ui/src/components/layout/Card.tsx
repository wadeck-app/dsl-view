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

// Elements that own their click: a click on one of them inside a clickable card must not also activate the card.
const NESTED_INTERACTIVE =
    'a[href], button, input, select, textarea, label, summary, [role="button"], [role="link"], [role="checkbox"], [role="switch"], [role="menuitem"], [role="tab"], [contenteditable=""], [contenteditable="true"]';

function isNestedInteractive(target: EventTarget | null, card: HTMLElement): boolean {
    if (!(target instanceof Element)) {
        return false;
    }
    const interactive = target.closest(NESTED_INTERACTIVE);
    return interactive !== null && interactive !== card && card.contains(interactive);
}

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
            onClick={isClickable ? (e) => { if (!isNestedInteractive(e.target, e.currentTarget)) { onClick?.(); } } : undefined}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            // Only the card's own key presses count: Enter/Space typed in a field or pressed on a button inside the
            // card bubble up here, and handling them would swallow the space in the field and click the card behind it.
            onKeyDown={isClickable ? (e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick?.(); } } : undefined}
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
