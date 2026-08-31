import React from 'react';

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {}

/**
 * @registryCategory atomic
 * @registryTags radio field
 */
export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(function Radio(
	{ className, ...rest },
	ref
) {
	return (
		<input
			ref={ref}
			type="radio"
			className={`h-3.5 w-3.5 border-border text-primary focus:ring-primary${className ? ` ${className}` : ''}`}
			{...rest}
		/>
	);
});
