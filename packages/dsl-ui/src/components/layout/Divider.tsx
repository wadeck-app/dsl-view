import React from 'react';

export interface DividerProps {
    orientation?: 'horizontal' | 'vertical';
    label?: string;
    className?: string;
}

/**
 * @registryCategory atomic
 * @registryTags divider separator line
 */
export function Divider({ orientation = 'horizontal', label, className = '' }: DividerProps) {
    if (orientation === 'vertical') {
        return <div role="separator" aria-orientation="vertical" className={`border-l border-border self-stretch ${className}`} />;
    }
    if (label) {
        return (
            <div role="separator" aria-orientation="horizontal" className={`flex items-center gap-2 w-full ${className}`}>
                <div className="flex-1 border-t border-border" />
                <span className="text-xs text-muted px-2 whitespace-nowrap">{label}</span>
                <div className="flex-1 border-t border-border" />
            </div>
        );
    }
    return <div role="separator" aria-orientation="horizontal" className={`border-t border-border w-full ${className}`} />;
}
