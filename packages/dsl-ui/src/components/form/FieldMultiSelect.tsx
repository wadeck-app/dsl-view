import React, { useId, useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';

const PILL_CLASS =
	'inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium';

const CONTAINER_BASE =
	'mt-1 min-h-[38px] w-full rounded border bg-surface text-content px-3 py-2 text-sm flex flex-wrap gap-1 items-center focus:outline-none focus:ring-1 focus:ring-primary';

const CONTENT_CLASS =
	'z-50 w-[var(--radix-popover-trigger-width)] bg-surface border border-border rounded shadow-md max-h-60 overflow-y-auto';

export interface FieldMultiSelectOption {
	value: string;
	label: string;
}

export interface FieldMultiSelectProps {
	name?: string;
	label: string;
	description?: string;
	required?: boolean;
	error?: string;
	disabled?: boolean;
	value: string[];
	onChange: (values: string[]) => void;
	options: FieldMultiSelectOption[];
	placeholder?: string;
	maxSelected?: number;
}

/**
 * @registryCategory atomic
 * @registryTags field multi-select
 * @registryBind formData onChange
 */
export function FieldMultiSelect({
	name,
	label,
	description,
	required,
	error,
	disabled,
	value,
	onChange,
	options,
	placeholder = 'Select...',
	maxSelected,
}: FieldMultiSelectProps) {
	const [open, setOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);
	const id = useId();

	function toggleOption(optValue: string) {
		if (value.includes(optValue)) {
			onChange(value.filter(v => v !== optValue));
		} else {
			if (maxSelected !== undefined && value.length >= maxSelected) return;
			onChange([...value, optValue]);
		}
	}

	function removeTag(optValue: string, e: React.MouseEvent) {
		e.stopPropagation();
		onChange(value.filter(v => v !== optValue));
	}

	function clearAll(e: React.MouseEvent) {
		e.stopPropagation();
		onChange([]);
	}

	function handleContainerClick() {
		if (disabled) return;
		setOpen(o => !o);
	}

	function handleContainerKeyDown(e: React.KeyboardEvent) {
		if (!open) {
			if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				setOpen(true);
				setActiveIndex(0);
			}
			return;
		}
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setActiveIndex(i => Math.min(i + 1, options.length - 1));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setActiveIndex(i => Math.max(i - 1, 0));
				break;
			case 'Enter':
			case ' ':
				e.preventDefault();
				if (activeIndex >= 0 && activeIndex < options.length) {
					toggleOption(options[activeIndex].value);
				}
				break;
			case 'Escape':
				e.preventDefault();
				setOpen(false);
				containerRef.current?.focus();
				break;
		}
	}

	const selectedLabels = value.map(v => options.find(o => o.value === v)?.label ?? v);
	const borderClass = error ? 'border-danger' : 'border-border focus:border-primary';
	const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

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

			<Popover.Root open={open} onOpenChange={disabled ? undefined : setOpen}>
				<Popover.Anchor asChild>
					{/* div instead of button to allow nested action buttons (pill removes, clear all) */}
					<div
						ref={containerRef}
						id={id}
						tabIndex={disabled ? -1 : 0}
						role="combobox"
						aria-haspopup="listbox"
						aria-expanded={open}
						aria-required={required}
						onClick={handleContainerClick}
						onKeyDown={handleContainerKeyDown}
						className={`${CONTAINER_BASE} ${borderClass} ${disabledClass}`}
					>
						{value.length === 0 ? (
							<span className="text-muted">{placeholder}</span>
						) : (
							<>
								{selectedLabels.map((lab, i) => (
									<span key={value[i]} className={PILL_CLASS}>
										{lab}
										<button
											type="button"
											aria-label={`Remove ${lab}`}
											onClick={e => removeTag(value[i], e)}
											className="hover:text-danger focus:outline-none leading-none"
										>
											{/* @formatter:off */}×{/* @formatter:on */}
										</button>
									</span>
								))}
								<button
									type="button"
									aria-label="Clear all"
									onClick={clearAll}
									className="ml-auto text-muted hover:text-danger focus:outline-none text-xs leading-none"
								>
									{/* @formatter:off */}✕{/* @formatter:on */}
								</button>
							</>
						)}
					</div>
				</Popover.Anchor>

				<Popover.Portal>
					<Popover.Content
						align="start"
						sideOffset={4}
						onOpenAutoFocus={e => e.preventDefault()}
						className={CONTENT_CLASS}
						role="listbox"
						aria-multiselectable="true"
						aria-label={label}
					>
						{options.map((opt, i) => {
							const isSelected = value.includes(opt.value);
							const isMaxReached =
								!isSelected && maxSelected !== undefined && value.length >= maxSelected;
							return (
								<button
									key={opt.value}
									type="button"
									role="option"
									aria-selected={isSelected}
									aria-disabled={isMaxReached}
									disabled={isMaxReached}
									data-active={i === activeIndex ? 'true' : undefined}
									onMouseEnter={() => setActiveIndex(i)}
									onClick={() => toggleOption(opt.value)}
									className={[
										'w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-content',
										isMaxReached
											? 'opacity-40 cursor-not-allowed'
											: 'cursor-pointer hover:bg-muted-bg',
										i === activeIndex ? 'bg-muted-bg' : '',
									].join(' ')}
								>
									<span
										aria-hidden="true"
										className={[
											'w-4 h-4 flex-shrink-0 rounded border flex items-center justify-center text-xs',
											isSelected
												? 'bg-primary border-primary text-white'
												: 'border-border',
										].join(' ')}
									>
										{isSelected && '✓'}
									</span>
									{opt.label}
								</button>
							);
						})}
					</Popover.Content>
				</Popover.Portal>
			</Popover.Root>

			{error && (
				<p className="mt-1 text-xs text-danger" role="alert">
					{error}
				</p>
			)}

			{/* Hidden inputs for native form submission */}
			{name && value.map(v => <input key={v} type="hidden" name={name} value={v} />)}
		</div>
	);
}
