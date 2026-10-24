import React from 'react';
import { ArrowRight, ChevronRight, ExternalLink, Eye, FileText, Info, Link as LinkIcon, List, Search } from 'lucide-react';

import { reportOnce } from '../dev/reportOnce.js';

// The icons a YAML view may name (`icon: external-link`). YAML cannot pass a React node, so this is the
// whole vocabulary: add an entry here when a view needs another icon.
// @formatter:off
const ICONS: Record<string, React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>> = {
	'arrow-right':   ArrowRight,
	'chevron-right': ChevronRight,
	'external-link': ExternalLink,
	'eye':           Eye,
	'file-text':     FileText,
	'info':          Info,
	'link':          LinkIcon,
	'list':          List,
	'search':        Search,
};
// @formatter:on

export const ICON_NAMES: readonly string[] = Object.keys(ICONS);

/**
 * The icon element for a YAML icon name. An unknown name is reported once with the supported names, and the
 * default `external-link` icon is shown instead of an empty, invisible control.
 */
export function iconByName(name: string | undefined, where: string, className = 'h-3.5 w-3.5'): React.ReactElement {
	const key = name ?? 'external-link';
	const Icon = ICONS[key];
	if (!Icon) {
		reportOnce(`[${where}] unknown icon "${key}": showing "external-link". Supported icons: ${ICON_NAMES.join(', ')}.`, console.error);
	}
	const Resolved = Icon ?? ExternalLink;
	return <Resolved className={className} aria-hidden="true" />;
}
