import React from 'react';
import { Button } from '../controls/_Button.js';
import { Dialog } from './Dialog.js';

export interface ConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	/** @slot tag:content */
	message: React.ReactNode;
	confirmLabel?: string;
	confirmVariant?: 'danger' | 'primary';
	onConfirm: () => void;
}

/**
 * @registryCategory composite
 * @registryTags dialog modal overlay
 */
export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	message,
	confirmLabel = 'Confirm',
	confirmVariant = 'danger',
	onConfirm,
}: ConfirmDialogProps) {
	return (
		<Dialog
			title={title}
			size="sm"
			open={open}
			onOpenChange={onOpenChange}
			actions={
				<>
					<Button variant="secondary" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button variant={confirmVariant} onClick={onConfirm}>
						{confirmLabel}
					</Button>
				</>
			}
		>
			<p className="text-sm text-muted">{message}</p>
		</Dialog>
	);
}
