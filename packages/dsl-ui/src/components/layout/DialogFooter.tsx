import React from 'react';

import { ButtonContext, useProvideButtonContext } from '../controls/buttonContext.js';

export interface DialogFooterProps {
	children: React.ReactNode;
	className?: string;
}

/**
 * @registryCategory layout
 * @registryTags dialog-footer dialog footer
 */
export function DialogFooter({ children, className = '' }: DialogFooterProps) {
	const ctx = useProvideButtonContext({ size: 'md' });
	return (
		<ButtonContext.Provider value={ctx}>
			<div className={['flex items-center justify-end gap-3 border-t pt-4', className].filter(Boolean).join(' ')}>
				{children}
			</div>
		</ButtonContext.Provider>
	);
}
