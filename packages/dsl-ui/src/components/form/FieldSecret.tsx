import { Eye, EyeOff } from 'lucide-react';
import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';

import { IconButton } from '../controls/IconButton.js';
import { FieldWrapper } from './FieldWrapper.js';

const inputClass =
	'block w-full rounded border border-border bg-surface text-content pl-3 pr-10 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

/** What the owner of a FieldSecret can do with it: read the typed text at the moment it needs it, and wipe it. */
export interface FieldSecretHandle {
	read: () => string;
	clear: () => void;
}

export interface FieldSecretProps {
	label: string;
	description?: string;
	/** Marks the field required. Handled by FieldWrapper. */
	required?: boolean;
	/** Validation message. Handled by FieldWrapper. */
	error?: string;
	disabled?: boolean;
	placeholder?: string;
	/** Fired on Enter in the field. Read the text through the ref then: it is never passed as an argument. */
	onEnter?: () => void;
	/** Label of the button that shows the text. Default "Show". */
	showLabel?: string;
	/** Label of the button that hides the text again. Default "Hide". */
	hideLabel?: string;
}

/**
 * A secret field (passphrase, token) that keeps what is typed out of React: it is uncontrolled, it has no `value` or
 * `onChange`, and the text lives only in the input. The owner takes a ref and calls `read()` when it submits, then `clear()`.
 * The field wipes itself when it unmounts. It is for React code: a DSL page cannot hold a ref.
 */
export const FieldSecret = React.forwardRef<FieldSecretHandle, FieldSecretProps>(function FieldSecret(
	{ label, description, required, error, disabled, placeholder, onEnter, showLabel = 'Show', hideLabel = 'Hide' },
	ref
) {
	const inputRef = useRef<HTMLInputElement>(null);
	// Only whether the text is visible: never the text.
	const [revealed, setRevealed] = useState(false);

	useImperativeHandle(
		ref,
		() => ({
			read: () => inputRef.current?.value ?? '',
			clear: () => {
				if (inputRef.current) {
					inputRef.current.value = '';
				}
			},
		}),
		[]
	);

	// Nothing outlives the field: the element may be kept alive by a closure or a detached tree.
	useEffect(() => {
		const el = inputRef.current;
		return () => {
			if (el) {
				el.value = '';
			}
		};
	}, []);

	return (
		<FieldWrapper label={label} description={description} required={required} error={error}>
			{control => (
				<div className="relative mt-1">
					<input
						{...control}
						ref={inputRef}
						type={revealed ? 'text' : 'password'}
						autoComplete="off"
						spellCheck={false}
						// Keeps password managers (1Password, LastPass) from offering to fill or save it.
						data-1p-ignore=""
						data-lpignore="true"
						disabled={disabled}
						placeholder={placeholder}
						onKeyDown={event => {
							if (event.key === 'Enter') {
								onEnter?.();
							}
						}}
						className={inputClass}
					/>
					<span className="absolute right-1 top-1/2 -translate-y-1/2">
						<IconButton
							icon={revealed ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
							aria-label={revealed ? hideLabel : showLabel}
							size="icon-sm"
							disabled={disabled}
							onClick={() => setRevealed(value => !value)}
						/>
					</span>
				</div>
			)}
		</FieldWrapper>
	);
});
