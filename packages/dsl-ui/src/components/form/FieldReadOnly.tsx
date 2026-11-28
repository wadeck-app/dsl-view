import React, { useContext, useEffect, useRef, useState } from 'react';

import { ToastContext } from '../overlay/Toast.js';
import { Button } from '../controls/_Button.js';
import { FieldWrapper } from './FieldWrapper.js';

// @formatter:off
const readOnlyValueClass = 'flex-1 rounded border border-border bg-bg-secondary px-3 py-1.5 text-sm text-content break-all';
// @formatter:on

export interface FieldReadOnlyProps {
	label: string;
	description?: string;
	/** Small muted text under the field (a format, a hint). It describes the control (aria-describedby). `description` sits above the field. */
	helpText?: string;
	value: string;
	mono?: boolean;
	copyable?: boolean;
}

/**
 * @registryCategory atomic
 * @registryTags field readonly
 */
export function FieldReadOnly({ label, description, helpText, value, mono = false, copyable = false }: FieldReadOnlyProps) {
	// Optional: a page without a ToastProvider still shows the field; the copy result then shows in the button itself.
	const toast = useContext(ToastContext);
	const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
	const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);

	function report(ok: boolean) {
		if (toast) {
			if (ok) toast.success('Copied to clipboard');
			else toast.error('Failed to copy - please copy manually');
			return;
		}
		setCopyState(ok ? 'copied' : 'failed');
		if (resetTimer.current) clearTimeout(resetTimer.current);
		resetTimer.current = setTimeout(() => setCopyState('idle'), 2000);
	}

	function handleCopy() {
		// navigator.clipboard is undefined outside secure contexts (plain http on a LAN host): say so
		// instead of throwing a TypeError nobody sees.
		if (!navigator.clipboard) {
			report(false);
			return;
		}
		navigator.clipboard.writeText(value).then(
			() => report(true),
			() => report(false)
		);
	}

	return (
		<FieldWrapper label={label} description={description} helpText={helpText}>
			<div className="mt-1 flex gap-2">
				<code className={`${readOnlyValueClass} ${mono ? 'font-mono' : ''}`}>
					{value}
				</code>
				{copyable && (
					<Button variant="secondary" onClick={handleCopy}>
						{copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy'}
					</Button>
				)}
			</div>
		</FieldWrapper>
	);
}
