import React from 'react';
import { X } from 'lucide-react';

export interface TagProps {
    label: string;
    color?: 'default' | 'blue' | 'green' | 'red' | 'yellow' | 'purple';
    onRemove?: () => void;
}

const REMOVE_BTN_CLASS = 'ml-0.5 rounded-full hover:opacity-70 focus:outline-none focus:ring-1 focus:ring-current';

// violations-suppress: tailwind/no-raw-color-class intentional tag palette - semantic distinction, not status colors
const COLOR_CLASSES: Record<NonNullable<TagProps['color']>, string> = {
    default: 'bg-muted-bg text-muted',
    blue:    'bg-blue-100 text-blue-800',
    green:   'bg-green-100 text-green-800',
    red:     'bg-red-100 text-red-800',
    yellow:  'bg-yellow-100 text-yellow-800',
    purple:  'bg-purple-100 text-purple-800',
};

/**
 * @registryCategory atomic
 * @registryTags tag chip label
 */
export function Tag({ label, color = 'default', onRemove }: TagProps) {
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_CLASSES[color]}`}>
            {label}
            {onRemove && (
                <button
                    type="button"
                    onClick={onRemove}
                    aria-label={`Remove ${label}`}
                    className={REMOVE_BTN_CLASS}
                >
                    <X size={10} />
                </button>
            )}
        </span>
    );
}
