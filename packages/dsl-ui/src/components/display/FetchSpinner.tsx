import { Loader2 } from 'lucide-react';
import React from 'react';

export interface FetchSpinnerProps {
	loading: boolean;
}

/**
 * @registryCategory atomic
 * @registryTags loading spinner
 */
export function FetchSpinner({ loading }: FetchSpinnerProps) {
	if (!loading) return null;
	return <Loader2 className="h-4 w-4 animate-spin text-muted" aria-label="Loading" />;
}
