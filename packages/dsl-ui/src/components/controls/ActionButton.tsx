import React from 'react';

import { iconByName } from '../display/iconByName.js';
import { reportOnce } from '../dev/reportOnce.js';
import { Button } from './_Button.js';

export interface ActionButtonProps {
	/**
	 * Name of the `$actions` entry this button runs. The entry owns the request (`url`), `confirm`, `reloadSources`,
	 * `successMessage`, `errorPrefix` and `notify`: the button behaves exactly like a table row action.
	 * An unknown name is reported with the names the page does have, and no request is sent.
	 */
	action: string;
	/** Visible text. With `iconOnly` it stays the accessible name and the tooltip. */
	label: string;
	/**
	 * Values for the `{placeholders}` of the action url, e.g. `params: { name: $sources.event.name }` fills
	 * `POST /events/{name}/push-test`. Filled like a row action fills them from a row (percent-encoded; a placeholder
	 * with no value stops before any request and is reported through the notifier).
	 * @resolveDeep
	 */
	params?: Record<string, unknown>;
	/**
	 * JSON body of the request, e.g. `body: { payload: $vars.payload }` to send page state. Each value may be an
	 * expression. Unset: no body (a table row action sends none either).
	 * @resolveDeep
	 */
	body?: Record<string, unknown>;
	/** An icon name from the YAML icon vocabulary (e.g. `rocket`); an unknown name is reported once. */
	icon?: string;
	/** Show only the icon (needs `icon`); `label` remains the accessible name and the tooltip. */
	iconOnly?: boolean;
	variant?: 'primary' | 'secondary' | 'danger' | 'danger-outline' | 'success' | 'neutral' | 'ghost';
	/** Geometry belongs to the design system: callers pick a size, never a padding. */
	size?: 'sm' | 'md';
	/** Keeps the button disabled (e.g. `disabled: $vars.noSelection`). It is enabled by default. */
	disabled?: boolean;
	/** Why the button is disabled; shown as a tooltip while it is. */
	disabledReason?: string;
	/**
	 * Runs an action of the page's `$actions` (the handler a table row action uses). Defaults to the page's
	 * `ctx.onAction`, so a page needs no wiring.
	 * @ctxDefault
	 */
	onAction?: (action: string, params: Record<string, unknown>, options?: { body?: Record<string, unknown> }) => Promise<void> | void;
	/**
	 * Actions currently running, by action name. Defaults to the page's `$ctx.$actionPending`: while this button's
	 * action runs, it is disabled and busy (the flag is per action name, so two buttons of one action share it).
	 * @ctxDefault $actionPending
	 */
	actionPending?: Record<string, boolean>;
}

/**
 * A page-level button that runs a `$actions` entry, outside any table row or form.
 *
 * @registryCategory atomic
 * @registryTags button action
 */
export function ActionButton({
	action,
	label,
	params,
	body,
	icon,
	iconOnly = false,
	variant = 'primary',
	size,
	disabled,
	disabledReason,
	onAction,
	actionPending,
}: ActionButtonProps) {
	const [pending, setPending] = React.useState(false);

	const unwired = !onAction;
	React.useEffect(() => {
		if (unwired) {
			console.error(
				`[ActionButton] "${label}" cannot run action "${action}": render it inside a GenericPageRunner (it provides onAction) or pass onAction.`
			);
		}
	}, [unwired, label, action]);

	const iconOnlyWithoutIcon = iconOnly && !icon;
	React.useEffect(() => {
		if (iconOnlyWithoutIcon) {
			reportOnce(`[ActionButton] "${label}": iconOnly needs an icon name, showing the label instead.`, console.error);
		}
	}, [iconOnlyWithoutIcon, label]);

	const handleClick = () => {
		if (!onAction || pending) {
			return;
		}
		setPending(true);
		// The page runner reports its own failures through the notifier; this only guards a host handler that rejects.
		void Promise.resolve(onAction(action, params ?? {}, body ? { body } : undefined))
			.catch((error: unknown) => {
				console.error(`[ActionButton] action "${action}" failed: ${error instanceof Error ? error.message : String(error)}`);
			})
			.finally(() => setPending(false));
	};

	const busy = pending || actionPending?.[action] === true;
	const showOnlyIcon = iconOnly && Boolean(icon);
	const iconElement = icon && !busy ? iconByName(icon, 'ActionButton.icon') : null;
	const resolvedSize = showOnlyIcon ? (size === 'sm' ? 'icon-sm' : 'icon') : size;

	return (
		<Button
			variant={variant}
			size={resolvedSize}
			onClick={handleClick}
			disabled={disabled || unwired}
			disabledReason={unwired ? 'Not rendered inside a page: there is no action to run' : disabledReason}
			loading={busy}
			aria-busy={busy || undefined}
			aria-label={showOnlyIcon ? label : undefined}
			title={showOnlyIcon ? label : undefined}
		>
			{iconElement}
			{showOnlyIcon ? null : label}
		</Button>
	);
}
