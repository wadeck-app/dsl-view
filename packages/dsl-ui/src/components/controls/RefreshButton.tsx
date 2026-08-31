import { RefreshCw } from 'lucide-react';
import React from 'react';

const refreshButtonClass =
	'flex items-center gap-1 rounded border border-border bg-surface px-2 py-1 text-xs text-muted hover:text-content disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer';

export interface RefreshButtonProps {
	onClick: () => void;
	loading?: boolean;
}

/**
 * @registryCategory atomic
 * @registryTags refresh button
 */
export function RefreshButton({ onClick, loading = false }: RefreshButtonProps) {
	return (
		// violations-suppress: react/no-raw-button RefreshButton IS an atomic wrapper for the refresh interaction
		<button
			type="button"
			onClick={onClick}
			disabled={loading}
			className={refreshButtonClass}
			title="Refresh"
			aria-label="Refresh"
		>
			<RefreshCw className={['h-3 w-3', loading ? 'animate-spin' : ''].filter(Boolean).join(' ')} />
			Refresh
		</button>
	);
}
