import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

/** What happened to a user action, as the host should present it. */
export interface Notification {
	kind: 'success' | 'error';
	/** Already user-facing: for an error, the optional `errorPrefix` plus the server/fetcher message. */
	message: string;
	/** HTTP status when the failure carried one (the fetcher's thrown Error has a numeric `status`). */
	status?: number;
	/** Name of the `$actions` entry (or `$brains` id) that produced it. */
	action?: string;
}

export type Notify = (notification: Notification) => void;

export const NotifierContext = createContext<Notify | null>(null);

export interface NotifierProviderProps {
	/** Host callback, e.g. mapping to the host's toast stack. When provided, the runner's inline banner is not rendered. */
	notify: Notify;
	children?: React.ReactNode;
}

/**
 * Lets the host own how action feedback is shown. Without one, GenericPageRunner renders an inline banner
 * above the page so feedback is never silent.
 */
export function NotifierProvider({ notify, children }: NotifierProviderProps) {
	return <NotifierContext.Provider value={notify}>{children}</NotifierContext.Provider>;
}

/** The notifier in effect: the host's, or the runner's inline banner. Throws outside both so a widget never notifies into the void. */
export function useNotifier(): Notify {
	const notify = useContext(NotifierContext);
	if (!notify) {
		throw new Error(
			'[useNotifier] No notifier available. Render inside a <GenericPageRunner> (it falls back to an inline banner) ' +
				'or wrap the tree in <NotifierProvider notify={...}>.'
		);
	}
	return notify;
}

export interface BannerItem extends Notification {
	id: number;
	/** How many identical notifications in a row this entry stands for (absent = 1). */
	count?: number;
}

function sameNotification(a: Notification, b: Notification): boolean {
	return a.kind === b.kind && a.message === b.message && a.status === b.status && a.action === b.action;
}

/**
 * Items are kept in arrival order. An identical notification right after the previous one folds into it (`count`)
 * instead of adding a line, and gets a new id so a success restarts its auto-dismiss. Nothing is dropped here: how
 * many are SHOWN is the banner's job (it collapses the older ones behind a "+N more" control), so an error never
 * disappears unread.
 */
export function useBannerNotifier(): { items: BannerItem[]; notify: Notify; dismiss: (id: number) => void } {
	const [items, setItems] = useState<BannerItem[]>([]);
	const nextId = useRef(1);
	const notify = useCallback<Notify>(notification => {
		const id = nextId.current++;
		setItems(prev => {
			const last = prev[prev.length - 1];
			if (last && sameNotification(last, notification)) {
				return [...prev.slice(0, -1), { ...last, id, count: (last.count ?? 1) + 1 }];
			}
			return [...prev, { ...notification, id }];
		});
	}, []);
	const dismiss = useCallback((id: number) => {
		setItems(prev => prev.filter(item => item.id !== id));
	}, []);
	return { items, notify, dismiss };
}
