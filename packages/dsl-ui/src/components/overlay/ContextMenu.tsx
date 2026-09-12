import * as RadixPopover from '@radix-ui/react-popover';
import React, { useRef, useState } from 'react';

export interface ContextMenuItem {
	label: string;
	icon?: React.ReactNode;
	onClick: () => void;
	disabled?: boolean;
	danger?: boolean;
	/**
	 * When true, renders a horizontal separator line in place of this item.
	 * label and onClick are ignored for separator items.
	 */
	separator?: boolean;
}

export interface ContextMenuProps {
	/** Element that opens/closes the menu (typically an icon button) */
	trigger: React.ReactNode;
	items: ContextMenuItem[];
	side?: 'top' | 'right' | 'bottom' | 'left';
	align?: 'start' | 'center' | 'end';
}

// @formatter:off
const itemBaseClass = 'flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-left transition-colors focus:outline-none';
const itemEnabledClass = 'hover:bg-surface-subtle focus:bg-surface-subtle text-content cursor-pointer';
const itemDangerClass = 'hover:bg-danger/10 focus:bg-danger/10 text-danger cursor-pointer';
const itemDisabledClass = 'opacity-50 cursor-not-allowed text-content-subtle pointer-events-none';
// @formatter:on

/**
 * @registryCategory disposition
 * @registryTags context-menu dropdown menu kebab overlay
 */
export function ContextMenu({ trigger, items, side = 'bottom', align = 'start' }: ContextMenuProps) {
	const [open, setOpen] = useState(false);
	const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

	// Indices of items that can receive keyboard focus (non-separator, non-disabled)
	const focusableIndices = items
		.map((item, i) => (!item.separator && !item.disabled ? i : -1))
		.filter(i => i !== -1);

	function handleOpenChange(next: boolean) {
		setOpen(next);
	}

	function handleItemClick(item: ContextMenuItem) {
		if (item.disabled || item.separator) return;
		setOpen(false);
		item.onClick();
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		const focused = document.activeElement;
		const currentItemIdx = itemRefs.current.findIndex(el => el === focused);
		const posInFocusable = focusableIndices.indexOf(currentItemIdx);

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			const next = focusableIndices[(posInFocusable + 1) % focusableIndices.length];
			itemRefs.current[next]?.focus();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			// When posInFocusable is -1 (nothing focused), wrap to last item
			const effectivePos = posInFocusable === -1 ? 0 : posInFocusable;
			const prev =
				focusableIndices[
					(effectivePos - 1 + focusableIndices.length) % focusableIndices.length
				];
			itemRefs.current[prev]?.focus();
		} else if (e.key === 'Home') {
			e.preventDefault();
			itemRefs.current[focusableIndices[0]]?.focus();
		} else if (e.key === 'End') {
			e.preventDefault();
			itemRefs.current[focusableIndices[focusableIndices.length - 1]]?.focus();
		}
	}

	return (
		<RadixPopover.Root open={open} onOpenChange={handleOpenChange}>
			<RadixPopover.Trigger asChild>
				<span style={{ display: 'contents' }}>{trigger}</span>
			</RadixPopover.Trigger>
			<RadixPopover.Portal>
				<RadixPopover.Content
					side={side}
					align={align}
					sideOffset={4}
					onKeyDown={handleKeyDown}
					onOpenAutoFocus={e => {
						e.preventDefault();
						// Focus the first focusable item when the menu opens
						const firstIdx = focusableIndices[0];
						if (firstIdx !== undefined) {
							itemRefs.current[firstIdx]?.focus();
						}
					}}
					className="z-50 min-w-[10rem] rounded-lg border border-border bg-surface p-1 shadow-lg outline-none"
					data-testid="context-menu-content"
				>
					<ul role="menu" className="flex flex-col">
						{items.map((item, index) => {
							if (item.separator) {
								return (
									<li key={index} role="separator" className="my-1 border-t border-border" data-testid="menu-separator" />
								);
							}

							return (
								<li key={index} role="none">
									<button
										// eslint-disable-next-line react-compiler/react-compiler
										ref={el => {
											itemRefs.current[index] = el;
										}}
										role="menuitem"
										tabIndex={-1}
										disabled={item.disabled}
										onClick={() => handleItemClick(item)}
										data-danger={item.danger ? 'true' : undefined}
										className={[
											itemBaseClass,
											item.disabled
												? itemDisabledClass
												: item.danger
													? itemDangerClass
													: itemEnabledClass,
										].join(' ')}
									>
										{item.icon !== undefined && (
											<span className="flex-shrink-0" aria-hidden="true">
												{item.icon}
											</span>
										)}
										<span>{item.label}</span>
									</button>
								</li>
							);
						})}
					</ul>
				</RadixPopover.Content>
			</RadixPopover.Portal>
		</RadixPopover.Root>
	);
}
