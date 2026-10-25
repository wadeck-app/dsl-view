import React from 'react';
import { ExternalLink } from 'lucide-react';
import { classFor } from '@dsl-ui/utils/warnUnknownChoice.js';

type LinkVariant = 'default' | 'muted' | 'danger';

export interface LinkProps {
	href: string;
	label: string;
	external?: boolean;
	variant?: LinkVariant;
}

// @formatter:off
const VARIANT_CLASSES: Record<LinkVariant, string> = {
	default: 'text-primary hover:underline',
	muted:   'text-muted hover:text-content',
	danger:  'text-danger hover:underline',
};
// @formatter:on

/**
 * @registryCategory atomic
 * @registryTags link anchor navigation
 */
export function Link({ href, label, external = false, variant = 'default' }: LinkProps) {
	return (
		<a
			href={href}
			className={`inline-flex items-center text-sm transition-colors ${classFor('Link', 'variant', variant, VARIANT_CLASSES, 'default')}`}
			{...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
		>
			{label}
			{external && <ExternalLink className="ml-0.5 h-3 w-3 inline" aria-hidden="true" />}
		</a>
	);
}
