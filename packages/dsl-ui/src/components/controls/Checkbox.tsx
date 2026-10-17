import React from 'react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
	/** Text shown beside the box. When set, the whole row is one click target (box + text). */
	label?: string;
}

/**
 * @registryCategory atomic
 * @registryTags checkbox field
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
	{ className, label, ...rest },
	ref
) {
	const input = (
		<input
			ref={ref}
			type="checkbox"
			className={`h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary${className ? ` ${className}` : ''}`}
			{...rest}
		/>
	);
	if (!label) return input;
	return (
		<label className="inline-flex items-center gap-2 cursor-pointer">
			{input}
			<span className="text-sm text-content">{label}</span>
		</label>
	);
});
