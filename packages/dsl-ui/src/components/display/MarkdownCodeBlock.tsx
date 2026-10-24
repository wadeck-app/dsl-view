import { Check, Copy, TriangleAlert } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import type { ExtraProps } from 'react-markdown';

import { reportOnce } from '../dev/reportOnce.js';

const COPY_RESET_MS = 2000;

const PRE_CLASS = 'overflow-x-auto rounded bg-muted-bg p-3 pr-24 text-xs font-mono text-content';
const COPY_BUTTON_CLASS =
	'absolute right-2 top-2 inline-flex items-center gap-1 rounded border border-border bg-surface px-2 py-0.5 text-xs text-muted hover:text-content focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-solid)]';

type CopyState = 'idle' | 'copied' | 'failed';

/**
 * The text of a fenced block's `<code>`: hast adds a trailing newline to the code node's value, which is not part of
 * the code the author wrote and must not end up in the clipboard.
 */
export function codeTextOf(node: ExtraProps['node']): string {
	const code = node?.children.find(child => child.type === 'element' && child.tagName === 'code');
	if (!code || code.type !== 'element') {
		return '';
	}
	const text = code.children.map(child => (child.type === 'text' ? child.value : '')).join('');
	return text.endsWith('\n') ? text.slice(0, -1) : text;
}

function describeFailure(error: unknown): string {
	// violations-suppress: ts/no-err-message-direct dsl-ui cannot import the renderer's internal getErrorMessage
	return error instanceof Error ? error.message : String(error);
}

// Not a component: the icon is chosen by the code block, which is the one component of this file.
function copyIconFor(state: CopyState): React.ReactElement {
	if (state === 'copied') {
		return <Check className="h-3 w-3" aria-hidden />;
	}
	return state === 'failed' ? <TriangleAlert className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />;
}

const COPY_LABEL: Record<CopyState, string> = { idle: 'Copy', copied: 'Copied', failed: 'Copy failed' };

/** A fenced code block with a copy button; a failed copy is visible on the button and logged with its reason. */
export function MarkdownCodeBlock({ code, children }: { code: string; children: React.ReactNode }) {
	const [state, setState] = useState<CopyState>('idle');
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	useEffect(() => () => clearTimeout(timer.current), []);

	function settle(next: CopyState) {
		setState(next);
		clearTimeout(timer.current);
		timer.current = setTimeout(() => setState('idle'), COPY_RESET_MS);
	}

	async function copy() {
		try {
			if (!navigator.clipboard) {
				throw new Error('the clipboard API is not available in this context');
			}
			await navigator.clipboard.writeText(code);
			settle('copied');
		} catch (error) {
			reportOnce(`[Markdown] could not copy the code block: ${describeFailure(error)}.`, console.error);
			settle('failed');
		}
	}

	return (
		<div className="relative my-2">
			<pre className={PRE_CLASS}>{children}</pre>
			{/* violations-suppress: react/no-raw-button the copy control sits on the code block corner and owns its geometry */}
			<button type="button" onClick={copy} aria-label="Copy code" className={COPY_BUTTON_CLASS}>
				{copyIconFor(state)}
				<span role="status">{COPY_LABEL[state]}</span>
			</button>
		</div>
	);
}
