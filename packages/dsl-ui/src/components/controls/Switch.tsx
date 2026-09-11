import React from 'react';
import * as RadixSwitch from '@radix-ui/react-switch';

export interface SwitchProps {
    label?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    size?: 'sm' | 'md';
}

const TRACK_BASE = 'relative inline-flex items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-solid)] focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-300 data-[state=checked]:bg-[var(--color-primary-solid)]';
const TRACK_SIZE: Record<'sm' | 'md', string> = { sm: 'w-9 h-5', md: 'w-11 h-6' };

const THUMB_BASE = 'block rounded-full bg-white shadow-sm transition-transform';
// OFF: 2px gap from left edge. ON: track_width - thumb_width - 2px (symmetric gap)
// sm: 36 - 16 - 2 = 18px. md: 44 - 20 - 2 = 22px
const THUMB_TRANSLATE_OFF = 'translate-x-0.5';
const THUMB_TRANSLATE_ON: Record<'sm' | 'md', string> = { sm: 'translate-x-[18px]', md: 'translate-x-[22px]' };
const THUMB_SIZE: Record<'sm' | 'md', string> = { sm: 'w-4 h-4', md: 'w-5 h-5' };

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
                <RadixSwitch.Thumb className={`${THUMB_BASE} ${THUMB_SIZE[size]} ${checked ? THUMB_TRANSLATE_ON[size] : THUMB_TRANSLATE_OFF}`} />
            </RadixSwitch.Root>
            {label && <span className="text-sm text-content">{label}</span>}
        </label>
    );
}
