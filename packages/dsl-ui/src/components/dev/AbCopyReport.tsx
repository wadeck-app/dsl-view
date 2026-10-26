import { Check, ClipboardCopy, TriangleAlert } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import type { AbTest } from './abTypes.js';

// How long "Copied" / "Copy failed" stays on the button before it goes back to "Copy report".
const FEEDBACK_MS = 2500;

// pointer-events-auto: the frame around it lets clicks through to the page.
const BUTTON_CLASS = 'pointer-events-auto flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-muted shadow-2xl hover:text-content disabled:cursor-not-allowed disabled:opacity-50';

/**
 * The text to paste to an agent, as short as possible: the page URL carrying the `ab.<id>=<option>` of every visible
 * test, then one `<id>=<option id>` line per visible test. A hidden test appears nowhere, not even as a leftover
 * `ab.<id>` parameter of the current URL.
 */
export function buildAbReport(shown: readonly AbTest[], hidden: readonly AbTest[], href: string): string {
	const url = new URL(href);
	for (const t of hidden) {
		url.searchParams.delete(`ab.${t.id}`);
	}
	for (const t of shown) {
		url.searchParams.set(`ab.${t.id}`, t.value);
	}
	return [url.toString(), ...shown.map((t) => `${t.id}=${t.value}`)].join('\n');
}

type Feedback = { kind: 'idle' } | { kind: 'copied' } | { kind: 'failed'; reason: string };

function describeFailure(error: unknown): string {
	return error instanceof Error && error.message ? error.message : String(error);
}

export function AbCopyReport({ shown, hidden }: { shown: readonly AbTest[]; hidden: readonly AbTest[] }): React.ReactElement {
	const [feedback, setFeedback] = useState<Feedback>({ kind: 'idle' });
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	useEffect(() => () => clearTimeout(timer.current), []);
	// Latest click wins: a slow write must not flip the button after a newer click.
	const clicks = useRef(0);

	const show = (next: Feedback): void => {
		setFeedback(next);
		clearTimeout(timer.current);
		timer.current = setTimeout(() => setFeedback({ kind: 'idle' }), FEEDBACK_MS);
	};
	const fail = (reason: string): void => {
		console.error(`[ab] Could not copy the A/B report to the clipboard: ${reason}`);
		show({ kind: 'failed', reason });
	};
	const copy = (): void => {
		const click = ++clicks.current;
		const text = buildAbReport(shown, hidden, window.location.href);
		const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
		if (!clipboard || typeof clipboard.writeText !== 'function') {
			fail('navigator.clipboard is unavailable. The browser only exposes it on a secure page (https or localhost).');
			return;
		}
		clipboard.writeText(text).then(
			() => {
				if (click === clicks.current) show({ kind: 'copied' });
			},
			(error: unknown) => {
				if (click === clicks.current) fail(describeFailure(error));
			}
		);
	};

	const empty = shown.length === 0;
	// The button is an icon: the name (aria-label) and the tooltip (title) carry the state, the icon shows it.
	let label = 'Copy report';
	let title = 'Copy report';
	let icon = <ClipboardCopy size={14} />;
	if (empty) {
		title = 'Nothing to copy: every test is hidden. Show a test with its reminder chip first.';
	} else if (feedback.kind === 'copied') {
		label = 'Copied';
		title = 'Copied';
		icon = <Check size={14} />;
	} else if (feedback.kind === 'failed') {
		label = 'Copy failed';
		title = `Copy failed: ${feedback.reason}`;
		icon = <TriangleAlert size={14} />;
	}
	return (
		// violations-suppress: react/no-raw-button AbDock IS the atomic wrapper for the A/B option picker; the copy button owns its geometry
		<button type="button" onClick={copy} disabled={empty} title={title} aria-label={label} className={BUTTON_CLASS}>
			{icon}
		</button>
	);
}
