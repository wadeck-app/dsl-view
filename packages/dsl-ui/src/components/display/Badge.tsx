import React from 'react';

import { useWarnMissingOnSolidToken } from '@dsl-ui/utils/onSolidToken.js';

import { AppLink, usableLinkTarget } from '../navigation/AppLink.js';
import { classFor } from '@dsl-ui/utils/warnUnknownChoice.js';

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
}

// @formatter:off
const SOLID_CLASSES: Record<BadgeVariant, string> = {
    default:  'bg-surface border border-border text-content',
    primary:  'bg-primary text-on-solid',
    success:  'bg-success text-on-solid',
    // Warning has no readable solid form: white on the amber fill fails contrast, so it uses
    // its subtle pair in both tones.
    warning:  'bg-warning-bg text-warning-text border border-warning-text/20',
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

const SIZE_CLASSES: Record<NonNullable<BadgeProps['size']>, string> = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
};
// @formatter:on

// A link badge keeps the badge's look; hover and keyboard focus are the only additions.
const LINK_CLASSES =
    'no-underline transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--color-primary-solid)]';

/**
 * @registryCategory atomic
 * @registryTags badge status
 */
export function Badge({ label, variant = 'default', tone = 'solid', size = 'sm', href, external = false }: BadgeProps) {
    // Only the solid fills of these variants paint text-on-solid.
    useWarnMissingOnSolidToken(tone !== 'subtle' && (variant === 'primary' || variant === 'success' || variant === 'danger'));
    const variantClasses = classFor('Badge', 'variant', variant, tone === 'subtle' ? SUBTLE_CLASSES : SOLID_CLASSES, 'default');
    const classes = `inline-flex items-center rounded-full font-medium ${variantClasses} ${classFor('Badge', 'size', size, SIZE_CLASSES, 'sm')}`;
    const target = usableLinkTarget(href, external, 'Badge');
    if (target) {
        return (
            <AppLink href={target} external={external} aria-label={label} className={`${classes} ${LINK_CLASSES}`}>
                {label}
            </AppLink>
        );
    }
    return <span className={classes}>{label}</span>;
}
