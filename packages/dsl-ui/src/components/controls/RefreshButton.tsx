import { RefreshCw } from 'lucide-react';
import React from 'react';

const refreshButtonClass =
	'flex items-center gap-1 rounded border border-border bg-surface px-2 py-1 text-xs text-muted hover:text-content disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer';

export interface RefreshButtonProps {
	/**
	 * Legacy / custom handler. When set it is called instead of `onRefresh` (and `loading` drives the spinner).
	 * Most pages should leave it out and use `source`.
	 */
	onClick?: () => void;
	/** Forces the spinner. Unset, the button shows its own pending state while a refresh runs. */
	loading?: boolean;
	/**
	 * Name of the `$sources` entry to re-fetch (e.g. `history`). Unset: every source of the page.
	 * An unknown name is reported through the notifier with the names the page does have.
	 */
	source?: string;
	/**
	 * Accessible name and visible text.
	 * @default 'Refresh'
	 */
	label?: string;
	/**
	 * Re-runs the page's sources (the same loader the poll timer and `reloadSources` use) and resolves when done; a
	 * failure is reported through the page's notifier. Defaults to the page's `$refresh`, so a page needs no wiring.
	 * While it runs the rows stay on screen: only the table's busy state changes, never a skeleton.
	 * @ctxDefault $refresh
	 */
	onRefresh?: (source?: string) => Promise<void>;
}

/**
 * @registryCategory atomic
 * @registryTags refresh button
 */
export function RefreshButton({ onClick, loading = false, source, label = 'Refresh', onRefresh }: RefreshButtonProps) {
	const [pending, setPending] = React.useState(false);

	const unwired = !onClick && !onRefresh;
	React.useEffect(() => {
		if (unwired) {
			console.error(
				'[RefreshButton] Nothing to refresh: render it inside a GenericPageRunner (it provides `$refresh`) or pass `onClick`.'
			);
		}
	}, [unwired]);

	const handleClick = () => {
		if (onClick) {
			onClick();
			return;
		}
		if (!onRefresh) {
			return;
		}
		setPending(true);
		// onRefresh reports its own failures through the notifier; the finally only releases the button.
		// (Settling after an unmount is a no-op in React 18+, no mounted flag needed.)
		void onRefresh(source).finally(() => setPending(false));
	};

	const busy = loading || pending;
	return (
		// violations-suppress: react/no-raw-button RefreshButton IS an atomic wrapper for the refresh interaction
		<button
			type="button"
			onClick={handleClick}
			disabled={busy || unwired}
			aria-busy={busy || undefined}
			className={refreshButtonClass}
			title={unwired ? 'Nothing to refresh: not rendered inside a page' : label}
			aria-label={label}
		>
			<RefreshCw className={['h-3 w-3', busy ? 'animate-spin motion-reduce:animate-none' : ''].filter(Boolean).join(' ')} />
			{label}
		</button>
	);
}
