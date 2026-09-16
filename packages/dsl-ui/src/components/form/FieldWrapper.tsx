import React, { useId } from 'react';

/** Props a field must spread onto its control so the label and ARIA state reach it. */
export interface FieldControlProps {
	id: string;
	'aria-invalid'?: true;
	'aria-describedby'?: string;
	'aria-required'?: true;
}

export interface FieldWrapperProps {
	label: string;
	description?: string;
	/** Marks the field as required: an asterisk on the label, aria-required on the control. */
	required?: boolean;
	/** Validation message shown under the field. Also marks the control invalid. */
	error?: string;
	/**
	 * The control. Given a node, the first element receives the label id and ARIA state.
	 * Given a function, it receives those props to spread on the control itself - which is
	 * what a field with a composite layout must use, since its first child is a wrapper
	 * element and not the control.
	 *
	 * @slot tag:atomic
	 */
	children: React.ReactNode | ((control: FieldControlProps) => React.ReactNode);
}

/**
 * Label, description, required marker and validation message for one field.
 *
 * required and error live here rather than in each Field* component: they apply to
 * every field, and a consumer that had to add them itself ended up maintaining a
 * parallel copy of FieldText and FieldNumber just to get a red message.
 *
 * @registryCategory disposition
 * @registryTags field wrapper
 */
export function FieldWrapper({ label, description, required, error, children }: FieldWrapperProps) {
	const id = useId();
	const errorId = `${id}-error`;

	// Undefined rather than false: React omits the attribute entirely, so a valid field
	// is not announced as "invalid, false".
	const control: FieldControlProps = {
		id,
		'aria-invalid': error ? true : undefined,
		'aria-describedby': error ? errorId : undefined,
		'aria-required': required ? true : undefined,
	};

	// Cloning the first child only works when that child IS the control. A field whose
	// first child is a layout element passes a function instead: cloning the wrapper put
	// the id on a div, leaving the real input with no accessible name at all.
	const body = typeof children === 'function'
		? children(control)
		: React.Children.map(children, (child, i) =>
			i === 0 && React.isValidElement(child)
				? React.cloneElement(child as React.ReactElement<Record<string, unknown>>, { ...control })
				: child);

	return (
		<div>
			<label htmlFor={id} className="block text-sm font-medium text-content">
				{label}
				{/* Decoration: aria-required on the control is what assistive tech reads. */}
				{required && <span aria-hidden="true"> *</span>}
			</label>
			{description && <p className="mb-1 text-xs text-muted">{description}</p>}
			{body}
			{/* role=alert so a message appearing after a failed submit is announced. */}
			{error && <p id={errorId} role="alert" className="mt-1 text-xs text-danger">{error}</p>}
		</div>
	);
}
