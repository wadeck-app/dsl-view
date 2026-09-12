import React from 'react';

import { ButtonContext, useProvideButtonContext } from '../controls/buttonContext.js';

export interface TableRowActionsProps {
	children: React.ReactNode;
	className?: string;
}

/**
 * @registryCategory layout
 * @registryTags table-row-actions row actions
 */
export function TableRowActions({ children, className = '' }: TableRowActionsProps) {
	const ctx = useProvideButtonContext({ size: 'sm', defaultVariant: 'ghost' });
	return (
		<ButtonContext.Provider value={ctx}>
			<div className={['flex items-center gap-1', className].filter(Boolean).join(' ')}>
				{children}
			</div>
		</ButtonContext.Provider>
	);
}
