import React from 'react';
import {
	Archive,
	ArrowRight,
	Check,
	ChevronRight,
	Copy,
	Download,
	ExternalLink,
	Eye,
	FileText,
	Info,
	Link as LinkIcon,
	List,
	Pencil,
	Play,
	Plus,
	RefreshCw,
	Rocket,
	RotateCcw,
	Search,
	Send,
	Trash2,
	X,
} from 'lucide-react';

import { reportOnce } from '../dev/reportOnce.js';

// The icons a YAML view may name (`icon: external-link`). YAML cannot pass a React node, so this is the
// whole vocabulary: add an entry here when a view needs another icon.
// @formatter:off
export type IconComponent = React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;

const ICONS = {
	'archive':       Archive,
	'arrow-right':   ArrowRight,
	'check':         Check,
	'chevron-right': ChevronRight,
	'copy':          Copy,
	'download':      Download,
	'external-link': ExternalLink,
	'eye':           Eye,
	'file-text':     FileText,
	'info':          Info,
	'link':          LinkIcon,
	'list':          List,
	'pencil':        Pencil,
	'play':          Play,
	'plus':          Plus,
	'refresh-cw':    RefreshCw,
	'rocket':        Rocket,
	'rotate-ccw':    RotateCcw,
	'search':        Search,
	'send':          Send,
	'trash':         Trash2,
	'x':             X,
} satisfies Record<string, IconComponent>;
// @formatter:on

/** The names a YAML node may use for an icon. */
export type IconName = keyof typeof ICONS;
export const ICON_NAMES = Object.keys(ICONS) as IconName[];
// Looked up by the text a node carries, which may be any string.
const ICON_LOOKUP: Readonly<Record<string, IconComponent | undefined>> = ICONS;

/**
 * The icon element for a YAML icon name. An unknown name is reported once with the supported names, and the
 * default `external-link` icon is shown instead of an empty, invisible control.
 */
export function iconByName(name: string | undefined, where: string, className = 'h-3.5 w-3.5'): React.ReactElement {
	const key = name ?? 'external-link';
	const Icon = ICON_LOOKUP[key];
	if (!Icon) {
		reportOnce(`[${where}] unknown icon "${key}": showing "external-link". Supported icons: ${ICON_NAMES.join(', ')}.`, console.error);
	}
	const Resolved = Icon ?? ExternalLink;
	return <Resolved className={className} aria-hidden="true" />;
}

/**
 * The icon component for a YAML icon name, for components that lay the icon out themselves. Unlike `iconByName`
 * an unknown name shows no icon (a wrong icon in a page header is worse than none); it is reported once with the
 * supported names.
 */
export function iconComponentByName(name: string, where: string): IconComponent | undefined {
	const Icon = ICON_LOOKUP[name];
	if (!Icon) {
		reportOnce(`[${where}] unknown icon "${name}": no icon is shown. Supported icons: ${ICON_NAMES.join(', ')}.`, console.error);
	}
	return Icon;
}
