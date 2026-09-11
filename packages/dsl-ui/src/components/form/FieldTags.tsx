import React, { useId, useRef, useState } from 'react';

const PILL_CLASS =
	'inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium flex-shrink-0';

const CONTAINER_CLASS =
	'mt-1 min-h-[38px] w-full rounded border bg-surface text-content px-3 py-2 text-sm flex flex-wrap gap-1 items-center cursor-text focus-within:ring-1 focus-within:ring-primary';

const INPUT_CLASS =
	'flex-1 min-w-[80px] bg-transparent outline-none text-sm placeholder:text-muted disabled:cursor-not-allowed';

export interface FieldTagsProps {
	name?: string;
	label: string;
	description?: string;
	required?: boolean;
	error?: string;
	disabled?: boolean;
	value: string[];
	onChange: (tags: string[]) => void;
	placeholder?: string;
	maxTags?: number;
	/** @default false */
	allowDuplicates?: boolean;
}

/**
 * @registryCategory atomic
 * @registryTags field tags input
 * @registryBind formData onChange
 */
export function FieldTags({
	name,
	label,
	description,
	required,
	error,
	disabled,
	value,
	onChange,
	placeholder = 'Add tag...',
	maxTags,
	allowDuplicates = false,
}: FieldTagsProps) {
	const [inputValue, setInputValue] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);
	const id = useId();

	const canAdd = maxTags === undefined || value.length < maxTags;

	function addTag(raw: string) {
		const tag = raw.trim();
		if (!tag) return;
		if (!allowDuplicates && value.includes(tag)) return;
		if (!canAdd) return;
		onChange([...value, tag]);
		setInputValue('');
	}

	function removeTag(index: number) {
		onChange(value.filter((_, i) => i !== index));
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === 'Enter') {
			e.preventDefault();
			addTag(inputValue);
		} else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
			removeTag(value.length - 1);
		}
	}

	function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
		const raw = e.target.value;
		if (raw.endsWith(',')) {
			addTag(raw.slice(0, -1));
		} else {
			setInputValue(raw);
		}
	}

	const borderClass = error ? 'border-danger' : 'border-border focus-within:border-primary';

	return (
		<div>
			<label htmlFor={id} className="block text-sm font-medium text-content">
				{label}
				{required && (
					<span className="ml-1 text-danger" aria-hidden="true">
						*
					</span>
				)}
			</label>
			{description && <p className="mb-1 text-xs text-muted">{description}</p>}

			<div
				className={`${CONTAINER_CLASS} ${borderClass}${disabled ? ' opacity-50' : ''}`}
				onClick={() => !disabled && inputRef.current?.focus()}
			>
				{value.map((tag, i) => (
					// Use index in key to support allowDuplicates
					<span key={`${tag}-${i}`} className={PILL_CLASS}>
						{tag}
						{!disabled && (
							<button
								type="button"
								aria-label={`Remove ${tag}`}
								onClick={e => {
									e.stopPropagation();
									removeTag(i);
								}}
								className="hover:text-danger focus:outline-none leading-none"
							>
								{/* @formatter:off */}×{/* @formatter:on */}
							</button>
						)}
					</span>
				))}

				<input
					ref={inputRef}
					id={id}
					type="text"
					value={inputValue}
					onChange={handleChange}
					onKeyDown={handleKeyDown}
					disabled={disabled || !canAdd}
					placeholder={canAdd && !disabled ? placeholder : ''}
					className={INPUT_CLASS}
					autoComplete="off"
					aria-required={required}
				/>
			</div>

			{error && (
				<p className="mt-1 text-xs text-danger" role="alert">
					{error}
				</p>
			)}

			{/* Hidden inputs for native form submission */}
			{name && value.map((v, i) => (
				// eslint-disable-next-line react/no-array-index-key
				<input key={i} type="hidden" name={name} value={v} />
			))}
		</div>
	);
}
