import React, { createContext, useContext } from 'react';

/** Asks the user to confirm an action. Resolves (or returns) `true` to go on, `false` to stop. */
export type Confirm = (message: string) => boolean | Promise<boolean>;

export const ConfirmContext = createContext<Confirm | null>(null);

export interface ConfirmProviderProps {
	/** Host callback, e.g. one that opens a styled dialog and resolves with the user's answer. */
	confirm: Confirm;
	children?: React.ReactNode;
}

/**
 * Lets the host own how an action's `confirm` question is asked (a dialog that matches the app). Without one, the runner uses the
 * browser's native `window.confirm`, which works everywhere but cannot be themed or translated.
 */
export function ConfirmProvider({ confirm, children }: ConfirmProviderProps) {
	return <ConfirmContext.Provider value={confirm}>{children}</ConfirmContext.Provider>;
}

/** The confirmer in effect: the host's, or the browser's native dialog. */
export function useConfirm(): Confirm {
	return useContext(ConfirmContext) ?? ((message: string) => window.confirm(message));
}
