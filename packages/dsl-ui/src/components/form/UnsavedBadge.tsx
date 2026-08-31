import React from 'react';

import { useFormContext } from './Form.js';

export interface UnsavedBadgeProps {
	hasChanges?: boolean;
}

/**
 * @registryCategory atomic
 * @registryTags status form-specific
 */
export function UnsavedBadge({ hasChanges }: UnsavedBadgeProps) {
	const formCtx = useFormContext();
	const resolved = hasChanges ?? formCtx?.hasChanges ?? false;
	if (!resolved) return null;
	return <span className="text-sm text-warning">Unsaved changes</span>;
}
