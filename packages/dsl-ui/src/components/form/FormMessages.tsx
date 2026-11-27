import React from 'react';

import { useFormContext } from './Form.js';
import type { FormMessage } from './Form.js';

const SEVERITY_CLASS: Record<FormMessage['severity'], string> = {
	error: 'text-danger',
	warning: 'text-warning-text',
	info: 'text-muted',
};

export interface FormMessagesProps {
	/** Extra classes for the block (spacing around it). */
	className?: string;
}

/**
 * The messages of the Form it sits in, errors first: errors are announced as alerts, warnings and infos as status. Nothing is
 * rendered while the form has no message, or outside a form.
 *
 * @registryCategory atomic
 * @registryTags field form-specific
 */
export function FormMessages({ className }: FormMessagesProps) {
	const messages = useFormContext()?.messages ?? [];
	if (messages.length === 0) {
		return null;
	}
	const errors = messages.filter(message => message.severity === 'error');
	const others = messages.filter(message => message.severity !== 'error');
	const list = (items: FormMessage[], role: 'alert' | 'status') =>
		items.length > 0 && (
			<ul role={role} className="space-y-0.5 text-sm">
				{items.map((message, index) => (
					<li key={index} className={SEVERITY_CLASS[message.severity]}>
						{message.field ? `${message.field}: ${message.text}` : message.text}
					</li>
				))}
			</ul>
		);
	return (
		<div className={['space-y-1', className].filter(Boolean).join(' ')}>
			{list(errors, 'alert')}
			{list(others, 'status')}
		</div>
	);
}
