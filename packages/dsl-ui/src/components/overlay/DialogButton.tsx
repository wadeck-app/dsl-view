import React from 'react';

import { reportAuthoringMistake } from '@dsl-ui/utils/devDiagnostics.js';
import { Button } from '../controls/_Button.js';
import { useDialogClose } from './Dialog.js';

export interface DialogButtonProps {
	label: string;
	variant?: 'primary' | 'secondary' | 'danger' | 'danger-outline' | 'success' | 'ghost';
	/**
	 * Name of the `$actions` entry to run (same entry as an `ActionButton`: it owns the request, `confirm` and the notifications).
	 * Unset: the button only closes the dialog (a Cancel).
	 */
	action?: string;
	/** Values for the `{placeholders}` of the action url. @resolveDeep */
	params?: Record<string, unknown>;
	/** JSON body of the request. @resolveDeep */
	body?: Record<string, unknown>;
	/**
	 * Close the dialog once the action succeeded (a failed, declined or already running action leaves it open). Default: true, and
	 * with no action the click closes at once.
	 */
	closesDialog?: boolean;
	disabled?: boolean;
	/** Why the button is disabled; shown as a tooltip while it is. */
	disabledReason?: string;
	/**
	 * Runs an action of the page's `$actions`. Defaults to the page's `ctx.onAction`.
	 * @ctxDefault
	 */
	onAction?: (action: string, params: Record<string, unknown>, options?: { body?: Record<string, unknown> }) => Promise<unknown> | unknown;
	/**
	 * Actions currently running, by action name. Defaults to the page's `$ctx.$actionPending`.
	 * @ctxDefault $actionPending
	 */
	actionPending?: Record<string, boolean>;
}

/**
 * A button for the `actions` of a Dialog. Without `action` it closes the dialog; with one it runs that page action and closes the
 * dialog when it succeeded, staying open (and off while it runs) otherwise.
 *
 * @registryCategory atomic
 * @registryTags button dialog-action
 */
export function DialogButton({ label, variant = 'secondary', action, params, body, closesDialog = true, disabled, disabledReason, onAction, actionPending }: DialogButtonProps) {
	const close = useDialogClose();
	const [pending, setPending] = React.useState(false);
	const outside = close === null;
	const unwired = action !== undefined && !onAction;
	React.useEffect(() => {
		if (outside) {
			reportAuthoringMistake(`[DialogButton] "${label}" is not inside a Dialog: it has nothing to close and stays disabled. Put it in the \`actions\` of a Dialog.`);
		} else if (unwired) {
			reportAuthoringMistake(`[DialogButton] "${label}" cannot run action "${action}": render it inside a GenericPageRunner (it provides onAction) or pass onAction.`);
		}
	}, [outside, unwired, label, action]);

	const handleClick = () => {
		if (pending) {
			return;
		}
		if (action === undefined || !onAction) {
			close?.();
			return;
		}
		setPending(true);
		// The page runner reports its own failures and resolves `false` for them; a host handler that rejects is logged here.
		void Promise.resolve(onAction(action, params ?? {}, body ? { body } : undefined))
			.then(outcome => {
				if (closesDialog && outcome !== false) {
					close?.();
				}
			})
			.catch((error: unknown) => {
				console.error(`[DialogButton] action "${action}" failed: ${error instanceof Error ? error.message : String(error)}`);
			})
			.finally(() => setPending(false));
	};

	const busy = pending || (action !== undefined && actionPending?.[action] === true);
	return (
		<Button
			variant={variant}
			onClick={handleClick}
			disabled={disabled || outside || unwired}
			disabledReason={outside ? 'Not inside a dialog' : unwired ? 'Not rendered inside a page: there is no action to run' : disabledReason}
			loading={busy}
			aria-busy={busy || undefined}
		>
			{label}
		</Button>
	);
}
