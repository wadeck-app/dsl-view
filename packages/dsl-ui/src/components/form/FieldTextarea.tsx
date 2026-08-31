import React from 'react';

import { FieldWrapper } from './FieldWrapper.js';

const textareaClass =
	'mt-1 block w-full rounded border border-border bg-surface text-content px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none';

export interface FieldTextareaProps {
	label: string;
	description?: string;
	value: string;
	onChange: (v: string) => void;
	rows?: number;
}

/**
 * @registryCategory atomic
 * @registryTags field
 * @registryBind formData onChange
 */
export function FieldTextarea({ label, description, value, onChange, rows = 4 }: FieldTextareaProps) {
	return (
		<FieldWrapper label={label} description={description}>
			<textarea
				rows={rows}
				value={value}
				onChange={e => onChange(e.target.value)}
				className={textareaClass}
			/>
		</FieldWrapper>
	);
}
