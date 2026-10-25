import React from 'react';

import { fillClasses, joinClasses } from '@dsl-ui/utils/fillClasses.js';
import { classFor } from '@dsl-ui/utils/warnUnknownChoice.js';

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
    /**
     * Takes the height its parent gives it (a dashboard tile) instead of the height of its content: the body grows and a
     * child that also `fill`s (a Chart, a stack) shares the room left between header and footer. The parent needs a
     * definite height.
     * @default false
     */
    fill?: boolean;
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
    fill: fillProp = false,
}: CardProps) {
    // Only the boolean true switches it on: a YAML string like "yes" must not half-apply the layout.
    const fill = fillProp === true;
    const isClickable = onClick !== undefined;

    const base = [
        'rounded-lg bg-surface overflow-hidden',
        border ? 'border border-border' : '',
        shadow ? 'shadow-sm' : '',
        isClickable ? 'cursor-pointer hover:shadow-md transition-shadow' : '',
        fill ? `flex flex-col ${fillClasses(fill)}` : '',
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
                <div className={joinClasses('border-b border-border', classFor('Card', 'padding', padding, PADDING_CLASSES, 'md'), fill && 'shrink-0')}>
                    {header}
                </div>
            )}
            <div className={joinClasses(classFor('Card', 'padding', padding, PADDING_CLASSES, 'md'), fill && 'flex min-h-0 flex-1 flex-col')}>{children}</div>
            {footer && (
                <div className={joinClasses('border-t border-border', classFor('Card', 'padding', padding, PADDING_CLASSES, 'md'), fill && 'shrink-0')}>
                    {footer}
                </div>
            )}
        </div>
    );
}
