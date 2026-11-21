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
     * Makes the badge removable: a cross inside it calls this. The badge then carries an inset ring in its variant colour
     * (same height as the other badges) and the cross shows a solid disc on hover and a focus ring on keyboard focus.
     * Not available together with `href`: a link badge is not removable, `onRemove` is ignored with an error in the console.
     */
    onRemove?: () => void;
    /** Accessible name of the cross. Default: "Remove <label>". */
    removeLabel?: string;
    /** Native tooltip of the whole badge (the cross has none). */
    title?: string;
}

// @formatter:off
const SOLID_CLASSES: Record<BadgeVariant, string> = {
    default:  'bg-surface border border-border text-content',
    primary:  'bg-primary text-on-solid',
    success:  'bg-success text-on-solid',
    // Warning has no readable solid form: white on the amber fill fails contrast, so it uses
    // its subtle pair in both tones.
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

// A removable badge is outlined in its own colour by an INSET ring, not a border: a border would make it 2px taller than the
// other badges of the row.
const REMOVABLE_RING_CLASSES: Record<BadgeVariant, string> = {
    default:  'ring-1 ring-inset ring-border',
    primary:  'ring-1 ring-inset ring-primary',
    success:  'ring-1 ring-inset ring-success',
    warning:  'ring-1 ring-inset ring-warning',
    danger:   'ring-1 ring-inset ring-danger',
    info:     'ring-1 ring-inset ring-info-text',
};

// Cross of a subtle badge: a solid disc on hover (the variant's accent with its ink) and a focus ring in the variant's text colour.
const REMOVE_SUBTLE_CLASSES: Record<BadgeVariant, string> = {
    default:  'hover:bg-muted hover:text-surface focus-visible:ring-muted',
    primary:  'hover:bg-primary hover:text-on-solid focus-visible:ring-primary',
    success:  'hover:bg-success hover:text-on-solid focus-visible:ring-success-text',
    warning:  'hover:bg-warning-text hover:text-warning-bg focus-visible:ring-warning-text',
    danger:   'hover:bg-danger hover:text-on-solid focus-visible:ring-danger-text',
    info:     'hover:bg-info-text hover:text-info-bg focus-visible:ring-info-text',
};

const SIZE_CLASSES: Record<NonNullable<BadgeProps['size']>, string> = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
};
// @formatter:on

const REMOVE_BUTTON_CLASSES = 'ml-1 -mr-1 inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2';
// A solid badge is already filled with the accent: a disc of the same colour would not show, so the cross gets a tint of its own ink.
const REMOVE_SOLID_CLASSES = 'hover:bg-[color-mix(in_srgb,currentColor_25%,transparent)] focus-visible:ring-current';

// A link badge keeps the badge's look; hover and keyboard focus are the only additions.
const LINK_CLASSES =
    'no-underline transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--color-primary-solid)]';

/**
 * @registryCategory atomic
 * @registryTags badge status
 */
export function Badge({ label, variant = 'default', tone = 'solid', size = 'sm', href, external = false, onRemove, removeLabel, title }: BadgeProps) {
    // Only the solid fills of these variants paint text-on-solid.
    useWarnMissingOnSolidToken(tone !== 'subtle' && (variant === 'primary' || variant === 'success' || variant === 'danger'));
    const baseClasses = classFor('Badge', 'variant', variant, tone === 'subtle' ? SUBTLE_CLASSES : SOLID_CLASSES, 'default');
    const target = usableLinkTarget(href, external, 'Badge');
    const removable = onRemove !== undefined && !target;
    if (onRemove && target) {
        reportAuthoringError(`[Badge] "${label}" has both href and onRemove: a link badge is not removable, the cross is not shown. Drop one of them.`);
    }
    // Outline: the variant's own border (default solid has one) gives way to an inset ring, so the height stays that of the other badges.
    const variantClasses = removable
        ? `${baseClasses.replace(/(^|\s)border(-\S+)?(?=\s|$)/g, ' ').trim()} ${classFor('Badge', 'variant', variant, REMOVABLE_RING_CLASSES, 'default')}`
        : baseClasses;
    const removeToneClasses = tone === 'subtle' ? classFor('Badge', 'variant', variant, REMOVE_SUBTLE_CLASSES, 'default') : REMOVE_SOLID_CLASSES;
    const classes = `inline-flex items-center rounded-full font-medium ${variantClasses} ${classFor('Badge', 'size', size, SIZE_CLASSES, 'sm')}`;
    if (target) {
        return (
            <AppLink href={target} external={external} aria-label={label} title={title} className={`${classes} ${LINK_CLASSES}`}>
                {label}
            </AppLink>
        );
    }
    if (removable) {
        return (
            <span className={classes} title={title}>
                {label}
                <button type="button" onClick={onRemove} aria-label={removeLabel ?? `Remove ${label}`} className={`${REMOVE_BUTTON_CLASSES} ${removeToneClasses}`}>
                    <X size={12} aria-hidden="true" />
                </button>
            </span>
        );
    }
    return (
        <span className={classes} title={title}>
            {label}
        </span>
    );
}
