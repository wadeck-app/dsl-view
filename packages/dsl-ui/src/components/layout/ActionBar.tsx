import React from 'react';

import { ButtonContext, useProvideButtonContext } from '../controls/buttonContext.js';

export interface ActionBarProps {
	/** @slot tag:btn */
	children: React.ReactNode;
	className?: string;
}

/**
 * @registryCategory disposition
 * @registryTags action-bar
 */
export function ActionBar({ children, className = '' }: ActionBarProps) {
	const ctx = useProvideButtonContext({ size: 'sm' });
	return (
		<ButtonContext.Provider value={ctx}>
			<div className={['flex items-center gap-4 mt-8', className].filter(Boolean).join(' ')}>
				{children}
			</div>
		</ButtonContext.Provider>
	);
}
