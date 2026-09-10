import * as RadixAvatar from '@radix-ui/react-avatar';
import React from 'react';

export interface AvatarProps {
    src?: string;
    alt?: string;
    fallback?: string;
    size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-base',
};

const FALLBACK_CLASS = 'w-full h-full flex items-center justify-center bg-primary text-white font-medium uppercase';

/**
 * @registryCategory atomic
 * @registryTags avatar user profile image
 */
export function Avatar({ src, alt, fallback, size = 'md' }: AvatarProps) {
    return (
        <RadixAvatar.Root className={`inline-flex items-center justify-center rounded-full overflow-hidden flex-shrink-0 ${SIZE_CLASSES[size]}`}>
            {src && (
                <RadixAvatar.Image
                    src={src}
                    alt={alt}
                    className="w-full h-full object-cover"
                />
            )}
            <RadixAvatar.Fallback
                delayMs={src ? 600 : 0}
                className={FALLBACK_CLASS}
            >
                {fallback ?? (alt ? alt.slice(0, 2) : '?')}
            </RadixAvatar.Fallback>
        </RadixAvatar.Root>
    );
}
