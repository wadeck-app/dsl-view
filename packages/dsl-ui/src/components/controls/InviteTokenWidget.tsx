import React from 'react';

import { useToast } from '../overlay/Toast.js';
import { Button } from '../controls/_Button.js';

// @formatter:off
const tokenDisplayClass = 'flex-1 rounded border border-border bg-bg-secondary px-3 py-2 text-sm font-mono text-content break-all';
// @formatter:on

export interface InviteTokenWidgetProps {
	inviteToken: string | null | undefined;
	onGenerateToken: () => void;
	isPending?: boolean;
}

/**
 * @registryCategory composite
 * @registryTags button token admin
 */
export function InviteTokenWidget({ inviteToken, onGenerateToken, isPending = false }: InviteTokenWidgetProps) {
	const toast = useToast();

	function handleCopy() {
		if (!inviteToken) return;
		navigator.clipboard.writeText(inviteToken).then(
			() => toast.success('Token copied to clipboard'),
			() => toast.error('Failed to copy - please copy manually')
		);
	}

	if (!inviteToken) {
		return (
			<div className="space-y-3">
				<p className="text-sm text-muted">
					Generate a one-time token (valid 24 h) and pass it to the new machine via{' '}
					<code className="rounded bg-muted-bg px-1 py-0.5 text-xs">
						wdrive register &lt;server_url&gt; --invite &lt;token&gt;
					</code>
				</p>
				<Button
					variant="primary"
					onClick={onGenerateToken}
					disabled={isPending}
					className="px-4 py-2 text-sm font-medium"
				>
					{isPending ? 'Generating...' : 'Generate invite token'}
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-2">
			<div className="flex items-center gap-2">
				<code className={tokenDisplayClass}>
					{inviteToken}
				</code>
				<Button
					variant="secondary"
					onClick={handleCopy}
					className="px-3 py-2 text-sm font-medium"
				>
					Copy
				</Button>
			</div>
			<p className="text-xs text-muted">Share out-of-band. Expires in 24h.</p>
		</div>
	);
}
