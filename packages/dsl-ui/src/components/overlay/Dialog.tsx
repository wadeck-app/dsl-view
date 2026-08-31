import { X } from 'lucide-react';
import React, { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

import { Button } from '../controls/_Button.js';

export const DialogCloseContext = createContext<(() => void) | null>(null);

export function useDialogClose(): (() => void) | null {
	return useContext(DialogCloseContext);
}

export interface DialogProps {
	title: string;
	/** @slot tag:btn */
	trigger?: React.ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	/** @slot tag:field, tag:layout, tag:table, tag:display, tag:composite */
	children: React.ReactNode;
	/** @slot tag:btn */
	actions?: React.ReactNode;
	size?: 'sm' | 'md' | 'lg' | 'xl';
}

// @formatter:off
const headerBarClass = 'flex items-center justify-between border-b border-border px-6 py-4';
const footerBarClass = 'flex items-center justify-end gap-3 border-t border-border px-6 py-4';
// @formatter:on

const SIZE_CLASSES: Record<NonNullable<DialogProps['size']>, string> = {
	sm: 'max-w-sm',
	md: 'max-w-lg',
	lg: 'max-w-2xl',
	xl: 'max-w-4xl',
};

/**
 * @registryCategory disposition
 * @registryTags dialog modal overlay
 */
export function Dialog({
	title,
	trigger,
	open: controlledOpen,
	onOpenChange,
	children,
	actions,
	size = 'md',
}: DialogProps) {
	const isControlled = controlledOpen !== undefined;
	const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
	const isOpen = isControlled ? controlledOpen : uncontrolledOpen;
	const titleId = useId();
	const dialogRef = useRef<HTMLDivElement>(null);
	const previousFocusRef = useRef<Element | null>(null);
	const isOpenRef = useRef(isOpen);
	useEffect(() => {
		isOpenRef.current = isOpen;
	}, [isOpen]);

	function setOpen(next: boolean) {
		if (!isControlled) setUncontrolledOpen(next);
		onOpenChange?.(next);
	}

	function handleTriggerClick() {
		setOpen(true);
	}

	function handleClose() {
		setOpen(false);
	}

	function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
		if (e.target === e.currentTarget) handleClose();
	}

	// ESC key handler - uses refs so the stable callback never re-registers the DOM listener
	const handleKeyDown = useCallback((e: KeyboardEvent) => {
		if (!isOpenRef.current) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			setOpen(false);
			return;
		}
		if (e.key === 'Tab') {
			const dialog = dialogRef.current;
			if (!dialog) return;
			const focusable = dialog.querySelectorAll<HTMLElement>(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			);
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (!first) return;
			if (e.shiftKey) {
				if (document.activeElement === first) {
					e.preventDefault();
					last?.focus();
				}
			} else {
				if (document.activeElement === last) {
					e.preventDefault();
					first?.focus();
				}
			}
		}
	}, []);

	useEffect(() => {
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [handleKeyDown]);

	// Focus management: trap focus when open, restore when closed
	useEffect(() => {
		if (isOpen) {
			previousFocusRef.current = document.activeElement;
			// Focus the first focusable element inside the dialog
			requestAnimationFrame(() => {
				const dialog = dialogRef.current;
				if (!dialog) return;
				const focusable = dialog.querySelector<HTMLElement>(
					'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
				);
				focusable?.focus();
			});
		} else {
			// Restore focus to the element that was focused before opening
			if (previousFocusRef.current instanceof HTMLElement) {
				previousFocusRef.current.focus();
			}
		}
	}, [isOpen]);

	const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES['md'];

	const modal = isOpen
		? ReactDOM.createPortal(
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
					onClick={handleBackdropClick}
					data-testid="dialog-backdrop"
				>
					<div
						ref={dialogRef}
						role="dialog"
						aria-modal="true"
						aria-labelledby={titleId}
						className={['relative w-full rounded-lg bg-surface shadow-xl', sizeClass].join(
							' '
						)}
						onClick={e => e.stopPropagation()}
					>
						{/* Header */}
						<div className={headerBarClass}>
							<h2 id={titleId} className="text-base font-semibold text-content">
								{title}
							</h2>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={handleClose}
								aria-label="Close dialog"
							>
								<X className="h-4 w-4" aria-hidden="true" />
							</Button>
						</div>

						{/* Body and footer share the close context so action buttons can call handleClose */}
						<DialogCloseContext.Provider value={handleClose}>
							{/* Body */}
							<div className="px-6 py-4">{children}</div>

							{/* Footer */}
							{actions && (
								<div className={footerBarClass}>
									{actions}
								</div>
							)}
						</DialogCloseContext.Provider>
					</div>
				</div>,
				document.body
			)
		: null;

	return (
		<>
			{trigger && (
				<span onClick={handleTriggerClick} style={{ display: 'contents' }}>
					{trigger}
				</span>
			)}
			{modal}
		</>
	);
}
