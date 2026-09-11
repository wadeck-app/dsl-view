import { X } from 'lucide-react';
import React, { createContext, useCallback, useContext, useEffect, useId, useRef } from 'react';
import ReactDOM from 'react-dom';

import { Button } from '../controls/_Button.js';

export const DrawerCloseContext = createContext<(() => void) | null>(null);

export function useDrawerClose(): (() => void) | null {
	return useContext(DrawerCloseContext);
}

export interface DrawerProps {
	open: boolean;
	onClose: () => void;
	side?: 'left' | 'right' | 'bottom';
	title?: string;
	footer?: React.ReactNode;
	children: React.ReactNode;
	size?: 'sm' | 'md' | 'lg';
	hideCloseButton?: boolean;
}

// @formatter:off
const SIDE_WIDTH_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
	sm: 'w-64',
	md: 'w-96',
	lg: 'w-[32rem]',
};

const SIDE_HEIGHT_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
	sm: 'h-48',
	md: 'h-96',
	lg: 'h-[32rem]',
};
// @formatter:on

function getPanelPositionClasses(side: 'left' | 'right' | 'bottom', size: 'sm' | 'md' | 'lg'): string {
	if (side === 'right') {
		return `top-0 right-0 h-full ${SIDE_WIDTH_CLASSES[size]}`;
	}
	if (side === 'left') {
		return `top-0 left-0 h-full ${SIDE_WIDTH_CLASSES[size]}`;
	}
	// bottom
	return `bottom-0 left-0 right-0 ${SIDE_HEIGHT_CLASSES[size]}`;
}

function getTranslateClass(side: 'left' | 'right' | 'bottom', open: boolean): string {
	if (open) return 'translate-x-0 translate-y-0';
	if (side === 'right') return 'translate-x-full';
	if (side === 'left') return '-translate-x-full';
	// bottom
	return 'translate-y-full';
}

/**
 * @registryCategory disposition
 * @registryTags drawer panel overlay slide
 */
export function Drawer({
	open,
	onClose,
	side = 'right',
	title,
	footer,
	children,
	size = 'md',
	hideCloseButton = false,
}: DrawerProps) {
	const titleId = useId();
	const drawerRef = useRef<HTMLDivElement>(null);
	const previousFocusRef = useRef<Element | null>(null);
	const isOpenRef = useRef(open);

	useEffect(() => {
		isOpenRef.current = open;
	}, [open]);

	function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
		if (e.target === e.currentTarget) onClose();
	}

	// ESC + focus trap via stable callback
	const handleKeyDown = useCallback((e: KeyboardEvent) => {
		if (!isOpenRef.current) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			onClose();
			return;
		}
		if (e.key === 'Tab') {
			const drawer = drawerRef.current;
			if (!drawer) return;
			const focusable = drawer.querySelectorAll<HTMLElement>(
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
	// onClose is intentionally excluded — isOpenRef guards stale closure, onClose identity doesn't matter
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [handleKeyDown]);

	// Focus management: save previous focus, restore on close
	useEffect(() => {
		if (open) {
			previousFocusRef.current = document.activeElement;
			requestAnimationFrame(() => {
				const drawer = drawerRef.current;
				if (!drawer) return;
				const focusable = drawer.querySelector<HTMLElement>(
					'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
				);
				focusable?.focus();
			});
		} else {
			if (previousFocusRef.current instanceof HTMLElement) {
				previousFocusRef.current.focus();
			}
		}
	}, [open]);

	const translateClass = getTranslateClass(side, open);
	const positionClasses = getPanelPositionClasses(side, size);

	const portal = ReactDOM.createPortal(
		<>
			{/* Backdrop */}
			<div
				className={[
					'fixed inset-0 z-40 bg-black/50 transition-opacity duration-300',
					open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
				].join(' ')}
				onClick={open ? onClose : undefined}
				data-testid="drawer-backdrop"
			/>

			{/* Panel — always in DOM for animation */}
			<div
				ref={drawerRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={title ? titleId : undefined}
				aria-label={!title ? 'Drawer' : undefined}
				className={[
					'fixed z-50 flex flex-col bg-surface shadow-2xl',
					'transition-transform duration-300 ease-in-out',
					positionClasses,
					translateClass,
				].join(' ')}
				data-testid="drawer-panel"
				onClick={e => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between border-b border-border px-6 py-4 flex-shrink-0">
					{title && (
						<h2 id={titleId} className="text-base font-semibold text-content">
							{title}
						</h2>
					)}
					{!hideCloseButton && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={onClose}
							aria-label="Close drawer"
						>
							<X className="h-4 w-4" aria-hidden="true" />
						</Button>
					)}
				</div>

				{/* Body */}
				<DrawerCloseContext.Provider value={onClose}>
					<div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>

					{/* Footer */}
					{footer && (
						<div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4 flex-shrink-0">
							{footer}
						</div>
					)}
				</DrawerCloseContext.Provider>
			</div>
		</>,
		document.body
	);

	return portal;
}
