import React from 'react';
import * as RadixSeparator from '@radix-ui/react-separator';

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
        return (
            <RadixSeparator.Root
                orientation="vertical"
                className={`border-l border-border self-stretch ${className}`}
            />
        );
    }

    if (label) {
        return (
            <div className={`flex items-center gap-2 w-full ${className}`}>
                <RadixSeparator.Root className="flex-1 border-t border-border" />
                <span className="text-xs text-muted px-2 whitespace-nowrap">{label}</span>
                <RadixSeparator.Root className="flex-1 border-t border-border" />
            </div>
        );
    }

    return (
        <RadixSeparator.Root
            className={`border-t border-border w-full ${className}`}
        />
    );
}
