import { X } from 'lucide-react';
import React from 'react';

import { Button } from '../controls/_Button.js';

export interface BulkActionsToolbarProps {
	selectedCount: number;
	onClearSelection: () => void;
	children?: React.ReactNode;
}

/**
 * @registryCategory atomic
 * @registryTags table bulk actions selection toolbar
 */
export function BulkActionsToolbar({ selectedCount, onClearSelection, children }: BulkActionsToolbarProps) {
	const visible = selectedCount > 0;

	return (
		<div
			role="toolbar"
			aria-label="Bulk actions"
			aria-hidden={visible ? undefined : 'true'}
			data-testid="bulk-actions-toolbar"
			className={[
				'flex items-center gap-3 px-3 py-2',
				'bg-primary-light border-b border-primary',
				'transition-all duration-200 ease-in-out overflow-hidden',
				visible ? 'max-h-16 opacity-100 pointer-events-auto' : 'max-h-0 opacity-0 pointer-events-none',
			].join(' ')}
		>
			<span className="text-sm font-medium text-primary">
				{selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
			</span>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={onClearSelection}
				aria-label="Clear selection"
				data-testid="bulk-actions-clear"
			>
				<X className="h-3.5 w-3.5" aria-hidden="true" />
				Clear
			</Button>
			{children}
		</div>
	);
}
