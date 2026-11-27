import React, { useCallback, useEffect, useRef, useState } from 'react';

import { ConfirmDialog } from './ConfirmDialog.js';

export interface UseConfirmDialogOptions {
	/** Title of the dialog. @default 'Please confirm' */
	title?: string;
	/** Label of the confirming button. @default 'Confirm' */
	confirmLabel?: string;
	/** Look of the confirming button. @default 'danger' (the usual confirmed action is a deletion) */
	confirmVariant?: 'danger' | 'primary';
}

interface Pending {
	message: string;
	resolve: (yes: boolean) => void;
}

/**
 * For the host app, once near the root: gives an action's `confirm` question (`$actions.<name>.confirm`) a dsl-ui dialog instead of the
 * browser's native `window.confirm`, which cannot follow the theme.
 *
 *     const { confirm, dialog } = useConfirmDialog();
 *     <ConfirmProvider confirm={confirm}>{children}{dialog}</ConfirmProvider>   // ConfirmProvider: @wadeck-app/dsl-renderer
 *
 * Asking again while a question is open answers "no" to the first. Not a DSL node: it is a React API, so it carries no
 * `@registryCategory`.
 */
export function useConfirmDialog({ title = 'Please confirm', confirmLabel = 'Confirm', confirmVariant = 'danger' }: UseConfirmDialogOptions = {}): {
	confirm: (message: string) => Promise<boolean>;
	dialog: React.ReactElement;
} {
	const [pending, setPending] = useState<Pending | null>(null);
	const pendingRef = useRef<Pending | null>(null);

	const settle = useCallback((yes: boolean) => {
		const current = pendingRef.current;
		pendingRef.current = null;
		setPending(null);
		current?.resolve(yes);
	}, []);

	const confirm = useCallback(
		(message: string) =>
			new Promise<boolean>(resolve => {
				pendingRef.current?.resolve(false);
				const next = { message, resolve };
				pendingRef.current = next;
				setPending(next);
			}),
		[]
	);

	// A question must not stay unanswered when the host unmounts: the action waiting on it would never end.
	useEffect(() => () => pendingRef.current?.resolve(false), []);

	const dialog = (
		<ConfirmDialog
			open={pending !== null}
			onOpenChange={open => {
				if (!open) settle(false);
			}}
			title={title}
			message={pending?.message ?? ''}
			confirmLabel={confirmLabel}
			confirmVariant={confirmVariant}
			onConfirm={() => settle(true)}
		/>
	);
	return { confirm, dialog };
}
