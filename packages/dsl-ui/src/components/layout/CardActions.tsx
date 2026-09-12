import React from 'react';

import { ButtonContext, useProvideButtonContext } from '../controls/buttonContext.js';

export interface CardActionsProps {
	children: React.ReactNode;
	className?: string;
}

/**
 * @registryCategory layout
 * @registryTags card-actions card actions
 */
export function CardActions({ children, className = '' }: CardActionsProps) {
	const ctx = useProvideButtonContext({ size: 'sm' });
	return (
		<ButtonContext.Provider value={ctx}>
			<div className={['flex items-center gap-2 pt-2', className].filter(Boolean).join(' ')}>
				{children}
			</div>
		</ButtonContext.Provider>
	);
}
