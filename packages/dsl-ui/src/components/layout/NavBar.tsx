import React from 'react';

import { ButtonContext, useProvideButtonContext } from '../controls/buttonContext.js';

export interface NavBarProps {
	children: React.ReactNode;
	className?: string;
}

/**
 * @registryCategory disposition
 * @registryTags nav-bar navigation
 */
export function NavBar({ children, className = '' }: NavBarProps) {
	const ctx = useProvideButtonContext({ size: 'sm', defaultVariant: 'ghost', lockSize: true, owner: 'NavBar' });
	return (
		<ButtonContext.Provider value={ctx}>
			<div className={['flex items-center gap-2', className].filter(Boolean).join(' ')}>
				{children}
			</div>
		</ButtonContext.Provider>
	);
}
