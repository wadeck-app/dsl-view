import React from 'react';

import { useToast } from '../overlay/Toast.js';
import { Button } from '../controls/_Button.js';
import { FieldWrapper } from './FieldWrapper.js';

// @formatter:off
const readOnlyValueClass = 'flex-1 rounded border border-border bg-bg-secondary px-3 py-1.5 text-sm text-content break-all';
// @formatter:on

export interface FieldReadOnlyProps {
	label: string;
	description?: string;
	value: string;
	mono?: boolean;
	copyable?: boolean;
}

/**
 * @registryCategory atomic
 * @registryTags field readonly
 */
export function FieldReadOnly({ label, description, value, mono = false, copyable = false }: FieldReadOnlyProps) {
	const toast = useToast();

	function handleCopy() {
		navigator.clipboard.writeText(value).then(
			() => toast.success('Copied to clipboard'),
			() => toast.error('Failed to copy - please copy manually')
		);
	}

	return (
		<FieldWrapper label={label} description={description}>
			<div className="mt-1 flex gap-2">
				<code className={`${readOnlyValueClass} ${mono ? 'font-mono' : ''}`}>
					{value}
				</code>
				{copyable && (
					<Button variant="secondary" onClick={handleCopy}>
						Copy
					</Button>
				)}
			</div>
		</FieldWrapper>
	);
}
