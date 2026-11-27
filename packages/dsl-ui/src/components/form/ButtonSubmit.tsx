import React from 'react';

import { reportAuthoringMistake } from '@dsl-ui/utils/devDiagnostics.js';
import { Button } from '../controls/_Button.js';
import { useFormContext } from './Form.js';

export interface ButtonSubmitProps {
	label?: string;
	/** Default `primary`; `danger` for a confirm-delete form. */
	variant?: 'primary' | 'danger' | 'success' | 'secondary';
	/** Shown while the save runs. */
	pendingLabel?: string;
	/**
	 * Wait for a modification before the button turns on (a form that edits something). Off by default: a form with no field
	 * (a delete confirmation) has nothing to change and must still submit.
	 */
	requireChanges?: boolean;
	/**
	 * How the wait is shown while the request runs: spinner (default), sweep, dots, bar, pulse, orbit. Every style but `spinner` keeps the
	 * button the size it has at rest and keeps its label (no `pendingLabel`).
	 * @default 'spinner'
	 */
	loadingStyle?: 'spinner' | 'sweep' | 'dots' | 'bar' | 'pulse' | 'orbit';
}

/**
 * Submits the form it sits in and follows its state: off while an error blocks the form (the reason is the first error),
 * off while the save runs (`pendingLabel`), on with warnings (their count is shown). Pick `ButtonSave` for the classic "Save
 * changes" that waits for a modification.
 *
 * @registryCategory atomic
 * @registryTags button form-specific
 */
export function ButtonSubmit({ label = 'Save', variant = 'primary', pendingLabel = 'Saving...', requireChanges = false, loadingStyle }: ButtonSubmitProps) {
	const form = useFormContext();
	React.useEffect(() => {
		if (form === null) {
			reportAuthoringMistake('[ButtonSubmit] is not inside a Form: it cannot submit anything and stays disabled. Put it in the `actions` of a Form.');
		}
	}, [form]);
	if (form === null) {
		return (
			<Button variant={variant} disabled>
				{label}
			</Button>
		);
	}
	const firstError = form.messages?.find(message => message.severity === 'error');
	const unchanged = requireChanges && form.hasChanges === false;
	const off = form.isPending || form.blocking === true || unchanged;
	// An animated style says "saving" itself and keeps the label, so the button does not change size; the default style keeps pendingLabel.
	const keepsLabel = loadingStyle !== undefined && loadingStyle !== 'spinner';
	const reason = firstError ? (firstError.field ? `${firstError.field}: ${firstError.text}` : firstError.text) : unchanged ? 'No changes to save' : undefined;
	const warnings = form.warnings ?? 0;
	const text = form.isPending && !keepsLabel ? pendingLabel : warnings > 0 ? `${label} · ${warnings} ${warnings === 1 ? 'warning' : 'warnings'}` : label;
	return (
		<Button type="submit" variant={variant} disabled={off && !form.isPending} loading={form.isPending} loadingStyle={loadingStyle} disabledReason={off && !form.isPending ? reason : undefined}>
			{text}
		</Button>
	);
}
