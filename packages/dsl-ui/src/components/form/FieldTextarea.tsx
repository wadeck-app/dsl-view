import React from 'react';

import { FieldWrapper } from './FieldWrapper.js';

const textareaClass =
	'mt-1 block w-full rounded border border-border bg-surface text-content px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none disabled:opacity-50 disabled:cursor-not-allowed';

export interface FieldTextareaProps {
	label: string;
	description?: string;
	value: string;
	onChange: (v: string) => void;
	rows?: number;
	/** Monospace text, for code, JSON and other pasted payloads. */
	mono?: boolean;
	placeholder?: string;
	/** Not editable but still focusable and submitted; onChange is never called. */
	readOnly?: boolean;
	disabled?: boolean;
	/** Marks the field required. Handled by FieldWrapper. */
	required?: boolean;
	/** Validation message. Handled by FieldWrapper. */
	error?: string;
}

/**
 * @registryCategory atomic
 * @registryTags field
 * @registryBind formData onChange
 */
export function FieldTextarea({
	label,
	description,
	value,
	onChange,
	rows = 4,
	mono = false,
	placeholder,
	readOnly,
	disabled,
	required,
	error,
}: FieldTextareaProps) {
	return (
		<FieldWrapper label={label} description={description} required={required} error={error}>
			<textarea
				rows={rows}
				value={value}
				// Like FieldText: a read-only field has no change path at all, whatever fires the event.
				onChange={readOnly ? undefined : e => onChange(e.target.value)}
				placeholder={placeholder}
				readOnly={readOnly}
				disabled={disabled}
				className={mono ? `${textareaClass} font-mono` : textareaClass}
			/>
		</FieldWrapper>
	);
}
