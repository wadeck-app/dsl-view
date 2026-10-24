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
const ICONS: Record<string, React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>> = {
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
