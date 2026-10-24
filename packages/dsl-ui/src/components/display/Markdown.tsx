import { ChevronDown, ChevronRight } from 'lucide-react';
import React, { useId, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { reportOnce } from '../dev/reportOnce.js';
import { codeTextOf, MarkdownCodeBlock } from './MarkdownCodeBlock.js';

export interface MarkdownProps {
	/** The markdown source. Raw HTML in it is shown as text, never rendered. */
	text?: string;
	/** Caps the height with internal scroll (CSS value, e.g. "20rem"). Unset = grows with the content. */
	maxHeight?: string;
	/** Starts folded to a short preview with a "Show more" toggle. */
	collapsed?: boolean;
	/**
	 * Loads remote images (`![alt](https://...)`). Off by default: an image URL inside logs or model output is an
	 * exfiltration channel (the request leaks that the page was opened, and what it contained if the URL carries data).
	 * Off renders the alt text instead.
	 */
	allowImages?: boolean;
}

// Only these schemes become links or images. react-markdown's default also lets irc/xmpp and relative URLs through.
const SAFE_URL = /^(https?:|mailto:)/i;

// A blocked url comes back empty: react-markdown then renders the element without the attribute.
function safeUrl(url: string): string {
	return SAFE_URL.test(url) ? url : '';
}

const LINK_CLASS = 'text-primary underline hover:no-underline';
const INLINE_CODE_CLASS = 'rounded bg-muted-bg px-1 py-0.5 font-mono text-xs text-content';
const TH_CLASS = 'border border-border bg-muted-bg px-2 py-1 text-left font-medium text-content';
const TOGGLE_CLASS =
	'mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-solid)]';

function buildComponents(allowImages: boolean): Components {
	return {
		h1: ({ node: _node, ...props }) => <h1 className="mb-2 mt-3 text-lg font-semibold text-content" {...props} />,
		h2: ({ node: _node, ...props }) => <h2 className="mb-2 mt-3 text-base font-semibold text-content" {...props} />,
		h3: ({ node: _node, ...props }) => <h3 className="mb-1 mt-2 text-sm font-semibold text-content" {...props} />,
		h4: ({ node: _node, ...props }) => <h4 className="mb-1 mt-2 text-sm font-medium text-content" {...props} />,
		h5: ({ node: _node, ...props }) => <h5 className="mb-1 mt-2 text-xs font-medium text-content" {...props} />,
		h6: ({ node: _node, ...props }) => <h6 className="mb-1 mt-2 text-xs font-medium text-muted" {...props} />,
		p: ({ node: _node, ...props }) => <p className="my-2 text-sm text-content" {...props} />,
		ul: ({ node: _node, ...props }) => <ul className="my-2 list-disc pl-5 text-sm text-content" {...props} />,
		ol: ({ node: _node, ...props }) => <ol className="my-2 list-decimal pl-5 text-sm text-content" {...props} />,
		blockquote: ({ node: _node, ...props }) => <blockquote className="my-2 border-l-2 border-border pl-3 text-sm text-muted" {...props} />,
		hr: ({ node: _node, ...props }) => <hr className="my-3 border-border" {...props} />,
		a: ({ node: _node, href, children }) =>
			href ? (
				<a href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
					{children}
				</a>
			) : (
				// A blocked URL (javascript:, data:, a relative path) leaves the text, not a dead or dangerous anchor.
				<span>{children}</span>
			),
		img: ({ node: _node, src, alt }) =>
			allowImages && src ? (
				<img src={src} alt={alt ?? ''} loading="lazy" referrerPolicy="no-referrer" className="max-w-full" />
			) : (
				<span className="text-muted">[image{alt ? `: ${alt}` : ''}]</span>
			),
		pre: ({ node, children }) => <MarkdownCodeBlock code={codeTextOf(node)}>{children}</MarkdownCodeBlock>,
		code: ({ node: _node, className, children }) => <code className={`${className ?? ''} ${INLINE_CODE_CLASS}`.trim()}>{children}</code>,
		table: ({ node: _node, ...props }) => (
			<div className="my-2 overflow-x-auto">
				<table className="w-full border-collapse text-sm" {...props} />
			</div>
		),
		th: ({ node: _node, ...props }) => <th className={TH_CLASS} {...props} />,
		td: ({ node: _node, ...props }) => <td className="border border-border px-2 py-1 text-content" {...props} />,
		// GFM task lists render as inputs: they are a status shown in the text, never a control.
		input: ({ node: _node, type, checked }) => <input type={type} checked={Boolean(checked)} disabled readOnly className="mr-1 align-middle" />,
	};
}

function sourceOf(text: unknown): string {
	if (text === undefined || text === null) {
		return '';
	}
	if (typeof text === 'string') {
		return text;
	}
	if (typeof text === 'number' || typeof text === 'boolean') {
		return String(text);
	}
	reportOnce(`[Markdown] \`text\` must be a string, got ${Array.isArray(text) ? 'an array' : typeof text}: nothing is rendered.`, console.error);
	return '';
}

/**
 * Renders markdown safely: raw HTML is shown as text (never parsed), links open in a new tab with
 * `noopener noreferrer` and only for http, https and mailto, images are not loaded unless `allowImages`, code
 * blocks get a copy button, GFM tables and task lists work.
 *
 * @registryCategory atomic
 * @registryTags markdown text
 * @registryLazy
 */
export function Markdown({ text, maxHeight, collapsed = false, allowImages = false }: MarkdownProps) {
	const [folded, setFolded] = useState(collapsed);
	const contentId = useId();
	const source = sourceOf(text);
	const components = useMemo(() => buildComponents(allowImages), [allowImages]);
	const scrolls = !folded && Boolean(maxHeight);

	const body = (
		<div
			id={contentId}
			className={folded ? 'max-h-24 overflow-hidden' : maxHeight ? 'overflow-y-auto' : undefined}
			style={scrolls ? { maxHeight } : undefined}
			tabIndex={scrolls ? 0 : undefined}
			aria-label={scrolls ? 'Markdown content' : undefined}
			role={scrolls ? 'region' : undefined}
		>
			<ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={safeUrl} components={components}>
				{source}
			</ReactMarkdown>
		</div>
	);

	if (!collapsed) {
		return body;
	}
	return (
		<div>
			{body}
			<button type="button" onClick={() => setFolded(value => !value)} aria-expanded={!folded} aria-controls={contentId} className={TOGGLE_CLASS}>
				{folded ? <ChevronRight className="h-3 w-3" aria-hidden /> : <ChevronDown className="h-3 w-3" aria-hidden />}
				{folded ? 'Show more' : 'Show less'}
			</button>
		</div>
	);
}
