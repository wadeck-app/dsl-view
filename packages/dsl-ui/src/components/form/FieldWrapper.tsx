import React, { useId } from 'react';

export interface FieldWrapperProps {
	label: string;
	description?: string;
	/** @slot tag:atomic */
	children: React.ReactNode;
}

/**
 * @registryCategory disposition
 * @registryTags field wrapper
 */
export function FieldWrapper({ label, description, children }: FieldWrapperProps) {
	const id = useId();
	// Clone the first child element and inject the generated id so label<->input are linked
	const childWithId = React.Children.map(children, (child, i) => {
		if (i === 0 && React.isValidElement(child)) {
			return React.cloneElement(child as React.ReactElement<{ id?: string }>, { id });
		}
		return child;
	});
	return (
		<div>
			{/* violations-suppress: no-raw-html-in-component FieldWrapper IS the HTML label primitive wrapper */}
			<label htmlFor={id} className="block text-sm font-medium text-content">{label}</label>
			{description && <p className="mb-1 text-xs text-muted">{description}</p>}
			{childWithId}
		</div>
	);
}
