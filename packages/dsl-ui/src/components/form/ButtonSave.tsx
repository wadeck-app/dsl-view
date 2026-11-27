import React from 'react';

import { Button } from '../controls/_Button.js';
import { useFormContext } from './Form.js';

export interface ButtonSaveProps {
	label?: string;
	onClick?: () => void;
	isPending?: boolean;
	hasChanges?: boolean;
	disabledReason?: string;
	/**
	 * How the wait is shown while the save runs: spinner (default), sweep, dots, bar, pulse, orbit. Every style but `spinner` keeps the
	 * button the size it has at rest and keeps its label (no "Saving...").
	 * @default 'spinner'
	 */
	loadingStyle?: 'spinner' | 'sweep' | 'dots' | 'bar' | 'pulse' | 'orbit';
}

/**
 * @registryCategory atomic
 * @registryTags button form-specific
 */
export function ButtonSave({ label = 'Save', onClick, isPending, hasChanges, disabledReason, loadingStyle }: ButtonSaveProps) {
	const formCtx = useFormContext();
	const resolvedIsPending = isPending ?? formCtx?.isPending ?? false;
	const resolvedHasChanges = hasChanges ?? formCtx?.hasChanges;
	const isInsideForm = formCtx !== null && onClick === undefined;

	// While the save runs the button is `loading` (off, and keeping its look); it is `disabled` only when there is nothing to save.
	const isDisabled = !resolvedIsPending && resolvedHasChanges === false;
	// An animated style says "saving" itself and keeps the label, so the button does not change size.
	const keepsLabel = loadingStyle !== undefined && loadingStyle !== 'spinner';
	const reason = disabledReason ?? (resolvedHasChanges === false ? 'No changes to save' : undefined);

	return (
		<Button
			type={isInsideForm ? 'submit' : 'button'}
			variant="primary"
			disabled={isDisabled}
			loading={resolvedIsPending}
			loadingStyle={loadingStyle}
			disabledReason={reason}
			onClick={isInsideForm ? undefined : onClick}
		>
			{resolvedIsPending && !keepsLabel ? 'Saving...' : label}
		</Button>
	);
}
