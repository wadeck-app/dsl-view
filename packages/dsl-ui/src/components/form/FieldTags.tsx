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
	/** Why the last attempt added nothing or less than asked; announced politely, cleared by the next success. */
	const [feedback, setFeedback] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);
	const id = useId();
	const errorId = `${id}-error`;
	const feedbackId = `${id}-feedback`;

	const canAdd = maxTags === undefined || value.length < maxTags;

	/**
	 * Adds the non-empty, trimmed tags in one onChange call. Tags that cannot be added (duplicates,
	 * beyond maxTags) are reported to the user in the status line instead of being dropped silently.
	 * Returns true when at least one tag was added.
	 */
	function addTags(raws: string[]): boolean {
		const next = [...value];
		const duplicates: string[] = [];
		let overLimit = 0;
		for (const raw of raws) {
			const tag = raw.trim();
			if (!tag) {
				continue;
			}
			if (!allowDuplicates && next.includes(tag)) {
				duplicates.push(tag);
				continue;
			}
			if (maxTags !== undefined && next.length >= maxTags) {
				overLimit += 1;
				continue;
			}
			next.push(tag);
		}
		const problems: string[] = [];
		if (duplicates.length > 0) {
			problems.push(`Already added: ${duplicates.join(', ')}`);
		}
		if (overLimit > 0) {
			problems.push(`Limit of ${maxTags} tags reached, ${overLimit} not added`);
		}
		setFeedback(problems.join('. '));
		if (next.length === value.length) {
			return false;
		}
		onChange(next);
		return true;
	}

	function removeTag(index: number) {
		setFeedback('');
		onChange(value.filter((_, i) => i !== index));
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (addTags([inputValue])) {
				setInputValue('');
			}
		} else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
			removeTag(value.length - 1);
		}
	}

	// A comma commits what precedes it; the text after the last comma stays in the input.
	function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
		const raw = e.target.value;
		if (!raw.includes(',')) {
			setInputValue(raw);
			// The message was about the previous attempt; the user is typing something else now.
			setFeedback('');
			return;
		}
		const parts = raw.split(',');
		const rest = parts.pop() ?? '';
		addTags(parts);
		setInputValue(rest);
	}

	// Pasting "a, b, c" adds three tags; a paste without a comma is inserted as usual.
	function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
		const text = e.clipboardData.getData('text');
		if (!text.includes(',')) {
			return;
		}
		e.preventDefault();
		addTags(text.split(','));
	}

	const describedBy = [error ? errorId : null, feedback ? feedbackId : null].filter(Boolean).join(' ') || undefined;

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
					onPaste={handlePaste}
					disabled={disabled || !canAdd}
					placeholder={canAdd && !disabled ? placeholder : ''}
					className={INPUT_CLASS}
					autoComplete="off"
					aria-required={required}
					aria-invalid={error ? true : undefined}
					aria-describedby={describedBy}
				/>
			</div>

			{/* Always rendered: a live region must exist before its text changes to be announced. */}
			<p id={feedbackId} role="status" className={feedback ? 'mt-1 text-xs text-muted' : 'sr-only'}>{feedback}</p>

			{error && (
				<p id={errorId} className="mt-1 text-xs text-danger" role="alert">
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
