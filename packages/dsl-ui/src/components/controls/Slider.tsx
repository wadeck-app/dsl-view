import React from 'react';
import * as RadixSlider from '@radix-ui/react-slider';

export interface SliderProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    label?: string;
    showValue?: boolean;
}

const TRACK_CLASS = 'relative flex items-center w-full h-5 select-none touch-none disabled:opacity-50';
const TRACK_BG = 'relative flex-1 h-2 bg-muted-bg rounded-full';
const RANGE_CLASS = 'absolute h-full bg-[var(--color-primary-solid)] rounded-full';
const THUMB_CLASS = 'block w-4 h-4 rounded-full bg-[var(--color-primary-solid)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-solid)] focus:ring-offset-1';

/**
 * @registryCategory atomic
 * @registryTags slider range input number
 * @registryBind formData onChange
 */
export function Slider({ value, onChange, min = 0, max = 100, step = 1, disabled, label, showValue }: SliderProps) {
    return (
        <div className="flex flex-col gap-1 w-full">
            {(label || showValue) && (
                <div className="flex items-center justify-between">
                    {label && <span className="text-sm font-medium text-content">{label}</span>}
                    {showValue && <span className="text-sm text-muted">{value}</span>}
                </div>
            )}
            <RadixSlider.Root
                value={[value]}
                onValueChange={([v]: [number]) => onChange(v)}
                min={min}
                max={max}
                step={step}
                disabled={disabled}
                className={TRACK_CLASS}
            >
                <RadixSlider.Track className={TRACK_BG}>
                    <RadixSlider.Range className={RANGE_CLASS} />
                </RadixSlider.Track>
                <RadixSlider.Thumb className={THUMB_CLASS} />
            </RadixSlider.Root>
        </div>
    );
}
