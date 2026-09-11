import * as RadixPopover from '@radix-ui/react-popover';
import React, { useState } from 'react';

export interface PopoverProps {
	/** Element that opens/closes the popover */
	trigger: React.ReactNode;
	/** Interactive content rendered inside the panel */
	children: React.ReactNode;
	side?: 'top' | 'right' | 'bottom' | 'left';
	align?: 'start' | 'center' | 'end';
	/** Controlled open state */
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	className?: string;
}

/**
 * @registryCategory disposition
 * @registryTags popover overlay panel interactive
 */
export function Popover({
	trigger,
	children,
	side = 'bottom',
	align = 'start',
	open: controlledOpen,
	onOpenChange,
	className,
}: PopoverProps) {
	const isControlled = controlledOpen !== undefined;
	const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
	const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

	function handleOpenChange(next: boolean) {
		if (!isControlled) setUncontrolledOpen(next);
		onOpenChange?.(next);
	}

	return (
		<RadixPopover.Root open={isOpen} onOpenChange={handleOpenChange}>
			<RadixPopover.Trigger asChild>
				<span style={{ display: 'contents' }}>{trigger}</span>
			</RadixPopover.Trigger>
			<RadixPopover.Portal>
				<RadixPopover.Content
					role="dialog"
					side={side}
					align={align}
					sideOffset={8}
					className={[
						'z-50 rounded-lg border border-border bg-surface p-4 shadow-lg outline-none',
						className,
					]
						.filter(Boolean)
						.join(' ')}
					data-testid="popover-content"
				>
					{children}
					<RadixPopover.Arrow className="fill-border" />
				</RadixPopover.Content>
			</RadixPopover.Portal>
		</RadixPopover.Root>
	);
}
