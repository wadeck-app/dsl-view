import React from 'react';
import * as RadixSwitch from '@radix-ui/react-switch';

export interface SwitchProps {
    label?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    size?: 'sm' | 'md';
}

const TRACK_BASE = 'relative inline-flex items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-solid)] focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed bg-muted-bg data-[state=checked]:bg-[var(--color-primary-solid)]';
const TRACK_SIZE: Record<'sm' | 'md', string> = { sm: 'w-9 h-5', md: 'w-11 h-6' };

const THUMB_BASE = 'block rounded-full bg-white shadow-sm transition-transform';
const THUMB_SIZE: Record<'sm' | 'md', string> = { sm: 'w-4 h-4 translate-x-0.5', md: 'w-5 h-5 translate-x-0.5' };
const THUMB_TRANSLATE: Record<'sm' | 'md', string> = { sm: 'data-[state=checked]:translate-x-4', md: 'data-[state=checked]:translate-x-5' };

/**
 * @registryCategory atomic
 * @registryTags switch toggle boolean
 * @registryBind formData onChange
 */
export function Switch({ label, checked, onChange, disabled, size = 'md' }: SwitchProps) {
    return (
        <label className="flex items-center gap-2 cursor-pointer">
            <RadixSwitch.Root
                checked={checked}
                onCheckedChange={onChange}
                disabled={disabled}
                className={`${TRACK_BASE} ${TRACK_SIZE[size]}`}
            >
                <RadixSwitch.Thumb className={`${THUMB_BASE} ${THUMB_SIZE[size]} ${THUMB_TRANSLATE[size]}`} />
            </RadixSwitch.Root>
            {label && <span className="text-sm text-content">{label}</span>}
        </label>
    );
}
