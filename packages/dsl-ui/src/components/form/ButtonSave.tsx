import React from 'react';

import { Button } from '../controls/_Button.js';
import { useFormContext } from './Form.js';

export interface ButtonSaveProps {
	label?: string;
	onClick?: () => void;
	isPending?: boolean;
	hasChanges?: boolean;
	disabledReason?: string;
}

/**
 * @registryCategory atomic
 * @registryTags button form-specific
 */
export function ButtonSave({ label = 'Save', onClick, isPending, hasChanges, disabledReason }: ButtonSaveProps) {
	const formCtx = useFormContext();
	const resolvedIsPending = isPending ?? formCtx?.isPending ?? false;
	const resolvedHasChanges = hasChanges ?? formCtx?.hasChanges;
	const isInsideForm = formCtx !== null && onClick === undefined;

	const isDisabled = resolvedIsPending || resolvedHasChanges === false;
	const reason = disabledReason ?? (resolvedHasChanges === false ? 'No changes to save' : undefined);

	return (
		<Button
			type={isInsideForm ? 'submit' : 'button'}
			variant="primary"
			disabled={isDisabled}
			disabledReason={reason}
			onClick={isInsideForm ? undefined : onClick}
		>
			{resolvedIsPending ? 'Saving...' : label}
		</Button>
	);
}
