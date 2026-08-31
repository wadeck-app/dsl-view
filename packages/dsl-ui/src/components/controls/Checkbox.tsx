import React from 'react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {}

/**
 * @registryCategory atomic
 * @registryTags checkbox field
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
	{ className, ...rest },
	ref
) {
	return (
		<input
			ref={ref}
			type="checkbox"
			className={`h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary${className ? ` ${className}` : ''}`}
			{...rest}
		/>
	);
});
