import React, { useEffect } from 'react';

import type { BannerItem } from './notifier.js';

const SUCCESS_AUTO_DISMISS_MS = 5000;

// Inline styles on purpose: dsl-renderer ships no CSS and cannot depend on dsl-ui (the dependency points the
// other way). The theme variables are the ones dsl-ui's theme.css defines; the fallbacks keep it readable without it.
const BANNER_COLORS = {
	success: { background: 'var(--color-success-bg, #f0fdf4)', color: 'var(--color-success-text, #166534)', border: 'var(--color-success, #16a34a)' },
	error: { background: 'var(--color-danger-bg, #fef2f2)', color: 'var(--color-danger-text, #b91c1c)', border: 'var(--color-danger, #dc2626)' },
} as const;

export function ActionBannerEntry({ item, onDismiss }: { item: BannerItem; onDismiss: (id: number) => void }) {
	useEffect(() => {
		if (item.kind !== 'success') {
			return undefined;
		}
		const timer = setTimeout(() => onDismiss(item.id), SUCCESS_AUTO_DISMISS_MS);
		return () => clearTimeout(timer);
	}, [item.id, item.kind, onDismiss]);

	const colors = BANNER_COLORS[item.kind];
	return (
		<div
			role={item.kind === 'error' ? 'alert' : 'status'}
			data-action-feedback={item.kind}
			style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				gap: '0.75rem',
				padding: '0.5rem 0.75rem',
				marginBottom: '0.5rem',
				borderRadius: '0.375rem',
				border: `1px solid ${colors.border}`,
				background: colors.background,
				color: colors.color,
				fontSize: '0.875rem',
			}}
		>
			<span>
				{item.message}
				{item.status !== undefined ? ` (HTTP ${item.status})` : ''}
				{item.count !== undefined && item.count > 1 ? ` ×${item.count}` : ''}
			</span>
			{/* violations-suppress: react/no-raw-button - dsl-renderer cannot import dsl-ui's Button (dependency direction) */}
			<button
				type="button"
				aria-label="Dismiss"
				onClick={() => onDismiss(item.id)}
				style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
			>
				×
			</button>
		</div>
	);
}
