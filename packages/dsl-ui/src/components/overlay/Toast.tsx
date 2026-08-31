import { CheckCircle, Info, X, XCircle } from 'lucide-react';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
	id: number;
	message: string;
	variant: ToastVariant;
}

interface ToastContextValue {
	success: (message: string) => void;
	error: (message: string) => void;
	info: (message: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

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
	'shrink-0 opacity-60 hover:opacity-100 transition-opacity cursor-pointer focus:outline-none';

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
	const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

	const dismiss = useCallback((id: number) => {
		setToasts(prev => prev.filter(t => t.id !== id));
		clearTimeout(timers.current.get(id));
		timers.current.delete(id);
	}, []);

	const add = useCallback(
		(message: string, variant: ToastVariant) => {
			const id = ++nextId;
			setToasts(prev => [...prev, { id, message, variant }]);
			timers.current.set(
				id,
				setTimeout(() => dismiss(id), TOAST_DURATION_MS)
			);
		},
		[dismiss]
	);

	useEffect(() => {
		const t = timers.current;
		return () => t.forEach(clearTimeout);
	}, []);

	const ctx: ToastContextValue = {
		success: msg => add(msg, 'success'),
		error: msg => add(msg, 'error'),
		info: msg => add(msg, 'info'),
	};

	return (
		<ToastContext.Provider value={ctx}>
			{children}
			<div
				aria-live="polite"
				aria-atomic="false"
				className="fixed bottom-4 right-4 flex flex-col gap-2 z-50 pointer-events-none"
			>
				{toasts.map(toast => (
					<div
						key={toast.id}
						role="status"
						className={[
							'pointer-events-auto flex items-center gap-2 rounded border px-3 py-2 text-sm shadow-md min-w-48 max-w-sm',
							variantStyles[toast.variant],
						].join(' ')}
					>
						{variantIcons[toast.variant]}
						<span className="flex-1">{toast.message}</span>
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
			</div>
		</ToastContext.Provider>
	);
}

export function useToast(): ToastContextValue {
	const ctx = useContext(ToastContext);
	if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
	return ctx;
}
