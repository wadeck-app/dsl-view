import React from 'react';
import { X } from 'lucide-react';

import { useWarnMissingOnSolidToken } from '@dsl-ui/utils/onSolidToken.js';

import { AppLink, usableLinkTarget } from '../navigation/AppLink.js';
import { classFor } from '@dsl-ui/utils/warnUnknownChoice.js';
import { reportAuthoringError } from '@dsl-ui/utils/devDiagnostics.js';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps {
    label: string;
    variant?: BadgeVariant;
    /**
     * Visual weight. 'solid' fills with the variant colour, 'subtle' tints the background and
     * colours the text.
     *
     * The variants used to disagree: success and danger were solid while warning and info
     * were subtle, so a status set drawing on several of them rendered as heavy and light
     * pills in the same row. A caller showing a set of statuses picks one tone for all of
     * them.
     */
    tone?: 'solid' | 'subtle';
    size?: 'sm' | 'md';
    /**
     * Makes the badge a link: an app path such as `/modules/queue/webhooks`, navigated through the router without a
     * page load. Ignored, with an error in the console, when it is not an absolute app path (or an http(s)/mailto URL
     * with `external`).
     */
    href?: string;
    /** Opens `href` as an external URL in a new tab. */
    external?: boolean;
    /**
     * Makes the badge removable: a cross inside it calls this. The badge then carries a border in its variant colour
     * (the cross needs a visible container) and the cross lights up on hover and keyboard focus.
     * Not available together with `href`: a link badge is not removable, `onRemove` is ignored with an error in the console.
     */
    onRemove?: () => void;
    /** Accessible name of the cross. Default: "Remove <label>". */
    removeLabel?: string;
}

// @formatter:off
const SOLID_CLASSES: Record<BadgeVariant, string> = {
    default:  'bg-surface border border-border text-content',
    primary:  'bg-primary text-on-solid',
    success:  'bg-success text-on-solid',
    // Warning has no readable solid form: white on the amber fill fails contrast, so it uses
    // its subtle pair in both tones. (A faint border on it, `border-warning-text/20`, generated no CSS: the theme colours are plain
    // `var()` values, which Tailwind 3 cannot give an opacity modifier. Use the plain token or none.)
    warning:  'bg-warning-bg text-warning-text',
    danger:   'bg-danger text-on-solid',
    info:     'bg-info-bg text-info-text',
};

const SUBTLE_CLASSES: Record<BadgeVariant, string> = {
    default:  'bg-muted-bg text-muted',
    primary:  'bg-primary-light text-primary',
    success:  'bg-success-bg text-success-text',
    warning:  'bg-warning-bg text-warning-text',
    danger:   'bg-danger-bg text-danger-text',
    info:     'bg-info-bg text-info-text',
};

// A removable badge is outlined in its own colour, whichever tone it has.
const REMOVABLE_BORDER_CLASSES: Record<BadgeVariant, string> = {
    default:  'border-border',
    primary:  'border-primary',
    success:  'border-success',
    warning:  'border-warning',
    danger:   'border-danger',
    info:     'border-info-text',
};

const SIZE_CLASSES: Record<NonNullable<BadgeProps['size']>, string> = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
};
// @formatter:on

// The cross takes the badge's ink (currentColor): the hover tint follows the variant and works in both themes.
const REMOVE_BUTTON_CLASSES =
    'ml-1 -mr-1 inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full opacity-70 transition ' +
    'hover:opacity-100 hover:bg-[color-mix(in_srgb,currentColor_20%,transparent)] ' +
    'focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-current';

// A link badge keeps the badge's look; hover and keyboard focus are the only additions.
const LINK_CLASSES =
    'no-underline transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--color-primary-solid)]';

/**
 * @registryCategory atomic
 * @registryTags badge status
 */
export function Badge({ label, variant = 'default', tone = 'solid', size = 'sm', href, external = false, onRemove, removeLabel }: BadgeProps) {
    // Only the solid fills of these variants paint text-on-solid.
    useWarnMissingOnSolidToken(tone !== 'subtle' && (variant === 'primary' || variant === 'success' || variant === 'danger'));
    const baseClasses = classFor('Badge', 'variant', variant, tone === 'subtle' ? SUBTLE_CLASSES : SOLID_CLASSES, 'default');
    const target = usableLinkTarget(href, external, 'Badge');
    const removable = onRemove !== undefined && !target;
    if (onRemove && target) {
        reportAuthoringError(`[Badge] "${label}" has both href and onRemove: a link badge is not removable, the cross is not shown. Drop one of them.`);
    }
    // Outline: replace the variant's own border (default and warning solid have one) by the one of the variant.
    const variantClasses = removable
        ? `${baseClasses.replace(/(^|\s)border(-\S+)?(?=\s|$)/g, ' ').trim()} border ${classFor('Badge', 'variant', variant, REMOVABLE_BORDER_CLASSES, 'default')}`
        : baseClasses;
    const classes = `inline-flex items-center rounded-full font-medium ${variantClasses} ${classFor('Badge', 'size', size, SIZE_CLASSES, 'sm')}`;
    if (target) {
        return (
            <AppLink href={target} external={external} aria-label={label} className={`${classes} ${LINK_CLASSES}`}>
                {label}
            </AppLink>
        );
    }
    if (removable) {
        return (
            <span className={classes}>
                {label}
                <button type="button" onClick={onRemove} aria-label={removeLabel ?? `Remove ${label}`} className={REMOVE_BUTTON_CLASSES}>
                    <X size={12} aria-hidden="true" />
                </button>
            </span>
        );
    }
    return <span className={classes}>{label}</span>;
}
