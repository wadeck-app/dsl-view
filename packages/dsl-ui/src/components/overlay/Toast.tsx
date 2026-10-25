import { CheckCircle, Info, X, XCircle } from 'lucide-react';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
	id: number;
	message: string;
	variant: ToastVariant;
	/** How many identical toasts in a row this one stands for. */
	count: number;
}

interface ToastContextValue {
	success: (message: string) => void;
	error: (message: string) => void;
	info: (message: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

// Success and info toasts auto-dismiss; an error stays until the user dismisses it (a failure must not vanish unread).
const TOAST_DURATION_MS = 4000;

const variantStyles: Record<ToastVariant, string> = {
	success: 'bg-success-bg border-success text-success-text',
	error: 'bg-danger-bg border-danger text-danger-text',
	info: 'bg-primary-light border-primary text-primary',
};

const variantIcons: Record<ToastVariant, React.ReactNode> = {
	success: <CheckCircle className="w-4 h-4 shrink-0" />,
	error: <XCircle className="w-4 h-4 shrink-0" />,
	info: <Info className="w-4 h-4 shrink-0" />,
};

const dismissButtonClass =
	'shrink-0 rounded opacity-60 hover:opacity-100 transition-opacity cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-current';

// Toasts shown at once; the older ones wait behind the "+N more" control (an error is folded, never dropped).
export const MAX_VISIBLE_TOASTS = 5;

const moreButtonClass =
	'pointer-events-auto self-end rounded text-xs underline text-muted hover:text-content cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-current';

let nextId = 0;

export interface ToastProviderProps {
	/** @slot tag:layout, tag:content */
	children: React.ReactNode;
}

/**
 * @registryCategory disposition
 * @registryTags toast provider
 */
export function ToastProvider({ children }: ToastProviderProps) {
	const [toasts, setToasts] = useState<ToastItem[]>([]);
	const [expanded, setExpanded] = useState(false);
	// The latest list, readable synchronously: the timers below are side effects, which do not belong in a state updater.
	const toastsRef = useRef<ToastItem[]>([]);
	const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

	const commit = useCallback((next: ToastItem[]) => {
		toastsRef.current = next;
		setToasts(next);
	}, []);

	const dismiss = useCallback(
		(id: number) => {
			commit(toastsRef.current.filter(t => t.id !== id));
			clearTimeout(timers.current.get(id));
			timers.current.delete(id);
		},
		[commit]
	);

	const add = useCallback(
		(message: string, variant: ToastVariant) => {
			const id = ++nextId;
			const current = toastsRef.current;
			const last = current[current.length - 1];
			// An identical toast right after the previous one folds into it (x2, x3...) and restarts its timer.
			if (last && last.message === message && last.variant === variant) {
				clearTimeout(timers.current.get(last.id));
				timers.current.delete(last.id);
				commit([...current.slice(0, -1), { ...last, id, count: last.count + 1 }]);
			} else {
				commit([...current, { id, message, variant, count: 1 }]);
			}
			if (variant !== 'error') {
				timers.current.set(
					id,
					setTimeout(() => dismiss(id), TOAST_DURATION_MS)
				);
			}
		},
		[dismiss, commit]
	);

	useEffect(() => {
		const t = timers.current;
		return () => t.forEach(clearTimeout);
	}, []);

	// Stable across renders: a consumer of useToast must not re-render each time a toast comes or goes.
	const ctx = useMemo<ToastContextValue>(
		() => ({
			success: msg => add(msg, 'success'),
			error: msg => add(msg, 'error'),
			info: msg => add(msg, 'info'),
		}),
		[add]
	);

	// Newest first; beyond the cap the older toasts fold behind one control.
	const newestFirst = [...toasts].reverse();
	const hidden = expanded ? 0 : Math.max(0, newestFirst.length - MAX_VISIBLE_TOASTS);
	const shownToasts = hidden > 0 ? newestFirst.slice(0, MAX_VISIBLE_TOASTS) : newestFirst;
	const canCollapse = expanded && newestFirst.length > MAX_VISIBLE_TOASTS;

	return (
		<ToastContext.Provider value={ctx}>
			{children}
			<div
				aria-live="polite"
				aria-atomic="false"
				className="fixed bottom-4 right-4 flex flex-col gap-2 z-50 pointer-events-none"
			>
				{shownToasts.map(toast => (
					<div
						key={toast.id}
						role={toast.variant === 'error' ? 'alert' : 'status'}
						className={[
							'pointer-events-auto flex items-center gap-2 rounded border px-3 py-2 text-sm shadow-md min-w-48 max-w-sm',
							variantStyles[toast.variant],
						].join(' ')}
					>
						{variantIcons[toast.variant]}
						<span className="flex-1">
							{toast.message}
							{toast.count > 1 ? ` ×${toast.count}` : ''}
						</span>
						{/* violations-suppress: react/no-raw-button - Toast dismiss is a notification primitive, not a navigation action */}
						<button
							onClick={() => dismiss(toast.id)}
							className={dismissButtonClass}
							aria-label="Dismiss"
						>
							<X className="w-3 h-3" />
						</button>
					</div>
				))}
				{(hidden > 0 || canCollapse) && (
					// violations-suppress: react/no-raw-button - folds the toast stack, a notification primitive
					<button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)} className={moreButtonClass}>
						{expanded ? 'Show fewer' : `+${hidden} more`}
					</button>
				)}
			</div>
		</ToastContext.Provider>
	);
}

export function useToast(): ToastContextValue {
	const ctx = useContext(ToastContext);
	if (!ctx) {
		throw new Error('useToast must be used inside <ToastProvider>');
	}
	return ctx;
}
