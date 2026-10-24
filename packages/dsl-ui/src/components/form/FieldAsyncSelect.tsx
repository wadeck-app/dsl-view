import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';

import { Spinner } from '../display/Spinner.js';

const inputClass =
	'block w-full rounded border border-border bg-surface text-content px-3 py-2 pr-16 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed';

const inputErrorClass = 'border-red-500 focus:border-red-500 focus:ring-red-500';

const CONTENT_CLASS =
	'z-50 w-[var(--radix-popover-trigger-width)] bg-surface border border-border rounded shadow-md max-h-60 overflow-y-auto';

export interface FieldAsyncSelectOption {
	label: string;
	value: string;
}

export interface FieldAsyncSelectProps {
	name?: string;
	label: string;
	description?: string;
	required?: boolean;
	error?: string;
	disabled?: boolean;
	value: string | null;
	onChange: (value: string | null) => void;
	loadOptions: (query: string) => Promise<FieldAsyncSelectOption[]>;
	/**
	 * Resolves the option of a value the user did not pick in this session (a saved form, an
	 * external change of `value`), so the input shows its label instead of the raw value.
	 * Without it the raw value is shown until an option is chosen.
	 */
	loadSelected?: (value: string) => Promise<FieldAsyncSelectOption | null>;
	placeholder?: string;
	/** Debounce delay in milliseconds before calling loadOptions. Default: 300 */
	debounceMs?: number;
	/** Message shown when loadOptions returns an empty array. Default: 'No options' */
	noOptionsMessage?: string;
}

/**
 * @registryCategory atomic
 * @registryTags field async select search combobox
 * @registryBind formData onChange
 */
export function FieldAsyncSelect({
	name,
	label,
	description,
	required,
	error,
	disabled,
	value,
	onChange,
	loadOptions,
	loadSelected,
	placeholder = 'Search...',
	debounceMs = 300,
	noOptionsMessage = 'No options',
}: FieldAsyncSelectProps) {
	const id = useId();
	const listboxId = `${id}-listbox`;

	const [inputValue, setInputValue] = useState('');
	/** The label shown for the selected value; a ref because only the "list closed" effect reads it. */
	const selectedLabelRef = useRef<string | null>(null);
	const [options, setOptions] = useState<FieldAsyncSelectOption[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isOpen, setIsOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(-1);
	/** True once at least one loadOptions call has resolved. Used to gate the
	 *  "no options" message so it does not appear while the first load is pending. */
	const [hasSearched, setHasSearched] = useState(false);
	/** True when the last loadOptions call rejected: shown as an error, never as "no options". */
	const [loadFailed, setLoadFailed] = useState(false);

	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const requestIdRef = useRef(0);
	const inputRef = useRef<HTMLInputElement>(null);

	// Cancel pending timers on unmount to avoid setState on unmounted component
	useEffect(() => {
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
			if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
		};
	}, []);

	/** The value `selectedLabel` belongs to: a different `value` means the label is stale. */
	const labelledValueRef = useRef<string | null>(null);
	/** True while `selectedLabel` is only the raw value, waiting for a real label. */
	const provisionalLabelRef = useRef(false);
	const optionsRef = useRef(options);
	optionsRef.current = options;
	const valueRef = useRef(value);
	valueRef.current = value;

	function showSelectedLabel(forValue: string, shown: string, provisional: boolean) {
		labelledValueRef.current = forValue;
		provisionalLabelRef.current = provisional;
		selectedLabelRef.current = shown;
		// A user who is typing a query keeps their text: closing the list restores the label.
		if (!isOpenRef.current) {
			setInputValue(shown);
		}
	}

	const isOpenRef = useRef(isOpen);
	isOpenRef.current = isOpen;

	// Keep the shown label in step with `value`: cleared, chosen here, or changed from outside.
	useEffect(() => {
		if (value === null) {
			labelledValueRef.current = null;
			provisionalLabelRef.current = false;
			selectedLabelRef.current = null;
			setInputValue('');
			return;
		}
		if (labelledValueRef.current === value) {
			return;
		}
		const known = optionsRef.current.find(o => o.value === value);
		if (known) {
			showSelectedLabel(value, known.label, false);
			return;
		}
		// Until the real label is known, the raw value beats an input that looks empty.
		showSelectedLabel(value, value, true);
		if (!loadSelected) {
			return;
		}
		// Not cancelled by the effect cleanup: StrictMode runs the effect twice and the second run
		// returns early above, so a cleanup flag would drop the only answer. A late answer is
		// ignored instead when `value` moved on or the user already chose something.
		const stillWanted = () => valueRef.current === value && labelledValueRef.current === value && provisionalLabelRef.current;
		loadSelected(value).then(
			resolved => {
				if (stillWanted() && resolved && resolved.value === value) {
					showSelectedLabel(value, resolved.label, false);
				}
			},
			(loadError: unknown) => {
				if (stillWanted()) {
					console.error(`[FieldAsyncSelect] loadSelected("${value}") failed; showing the raw value:`, loadError);
				}
			},
		);
		// showSelectedLabel only touches refs and state setters.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [value, loadSelected]);

	// Options loaded after the value was set can supply the label of a provisional one.
	useEffect(() => {
		if (value === null || !provisionalLabelRef.current) {
			return;
		}
		const known = options.find(o => o.value === value);
		if (known) {
			showSelectedLabel(value, known.label, false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [options]);

	// When dropdown closes, revert input to show the selected label (or empty)
	// and reset search state for the next open.
	useEffect(() => {
		if (!isOpen) {
			setInputValue(selectedLabelRef.current ?? '');
			setActiveIndex(-1);
			setHasSearched(false);
			setLoadFailed(false);
		}
		// The label is read from a ref and isOpen is the only trigger: revert the input when the list closes.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen]);

	const triggerLoad = useCallback(
		(query: string) => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
			debounceRef.current = setTimeout(async () => {
				// Sequence guard: ignore responses from superseded requests
				const requestId = ++requestIdRef.current;
				setIsLoading(true);
				try {
					const result = await loadOptions(query);
					if (requestId !== requestIdRef.current) return;
					setOptions(result);
					setLoadFailed(false);
					setHasSearched(true);
					setActiveIndex(-1);
				} catch (loadError) {
					if (requestId !== requestIdRef.current) return;
					// A failed load must not read as "no options": keep the cause for whoever debugs it.
					console.error(`[FieldAsyncSelect] loadOptions("${query}") failed:`, loadError);
					setOptions([]);
					setLoadFailed(true);
					setHasSearched(true);
				} finally {
					if (requestId === requestIdRef.current) setIsLoading(false);
				}
			}, debounceMs);
		},
		[loadOptions, debounceMs],
	);

	function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
		const text = e.target.value;
		setInputValue(text);
		setActiveIndex(-1);
		setHasSearched(false); // reset so "no options" doesn't flash from prior search
		// Open dropdown immediately so Radix mounts the Content synchronously,
		// then options populate once the async load completes.
		setIsOpen(true);
		triggerLoad(text);
	}

	function handleFocus() {
		if (!disabled) {
			// Coming back before the delayed close of a previous blur fired: keep the list open.
			if (blurTimerRef.current) {
				clearTimeout(blurTimerRef.current);
			}
			setHasSearched(false);
			setIsOpen(true);
			triggerLoad(inputValue);
		}
	}

	function handleSelect(opt: FieldAsyncSelectOption) {
		labelledValueRef.current = opt.value;
		provisionalLabelRef.current = false;
		selectedLabelRef.current = opt.label;
		setInputValue(opt.label);
		onChange(opt.value);
		setIsOpen(false);
		setActiveIndex(-1);
	}

	function handleClear(e: React.MouseEvent) {
		e.stopPropagation();
		labelledValueRef.current = null;
		provisionalLabelRef.current = false;
		selectedLabelRef.current = null;
		setInputValue('');
		setOptions([]);
		setIsOpen(false);
		onChange(null);
		inputRef.current?.focus();
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				if (!isOpen) {
					setIsOpen(true);
					triggerLoad(inputValue);
				} else {
					setActiveIndex(i => Math.min(i + 1, options.length - 1));
				}
				break;
			case 'ArrowUp':
				if (!isOpen) return;
				e.preventDefault();
				setActiveIndex(i => Math.max(i - 1, -1));
				break;
			case 'Enter':
				if (!isOpen) return;
				e.preventDefault();
				if (options.length > 0) {
					const idx = activeIndex >= 0 ? activeIndex : 0;
					const opt = options[idx];
					if (opt) handleSelect(opt);
				}
				break;
			case 'Escape':
				if (!isOpen) return;
				e.preventDefault();
				setIsOpen(false);
				break;
		}
	}

	function handleBlur() {
		// Delay to allow option onMouseDown/onClick to fire first.
		// onMouseDown={e.preventDefault()} on options keeps focus on input,
		// so blur only fires on tab-away or external focus loss.
		if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
		blurTimerRef.current = setTimeout(() => {
			setIsOpen(false);
		}, 150);
	}

	const activeDescendant =
		activeIndex >= 0 && options[activeIndex] ? `${id}-option-${activeIndex}` : undefined;

	// Show "no options" only after at least one search has resolved (not during initial load).
	const showLoadError = isOpen && !isLoading && hasSearched && loadFailed;
	const showNoOptions = isOpen && !isLoading && hasSearched && options.length === 0 && !loadFailed;
	const errorId = `${id}-error`;
	const showOptions = isOpen && options.length > 0;

	return (
		<div>
			<label htmlFor={id} className="block text-sm font-medium text-content">
				{label}
				{required && (
					// @formatter:off
					<span className="ml-1 text-red-500" aria-hidden="true">*</span>
					// @formatter:on
				)}
			</label>
			{description && <p className="mb-1 text-xs text-muted">{description}</p>}

			<Popover.Root
				open={isOpen}
				onOpenChange={open => {
					if (!open) setIsOpen(false);
				}}
			>
				<Popover.Anchor asChild>
					<div className="relative mt-1">
						{/* Hidden input carries the actual value for form submission */}
						{name && (
							<input type="hidden" name={name} value={value ?? ''} />
						)}
						<input
							ref={inputRef}
							id={id}
							type="text"
							role="combobox"
							aria-expanded={isOpen}
							aria-haspopup="listbox"
							aria-autocomplete="list"
							aria-controls={listboxId}
							aria-activedescendant={activeDescendant}
							aria-required={required}
							aria-invalid={error ? true : undefined}
							aria-describedby={error ? errorId : undefined}
							value={inputValue}
							onChange={handleInputChange}
							onFocus={handleFocus}
							onKeyDown={handleKeyDown}
							onBlur={handleBlur}
							placeholder={placeholder}
							disabled={disabled}
							autoComplete="off"
							className={`${inputClass}${error ? ` ${inputErrorClass}` : ''}`}
						/>
						<div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1 pointer-events-none">
							{isLoading && <Spinner size="sm" />}
						</div>
						{value !== null && !isLoading && (
							<button
								type="button"
								aria-label="Clear selection"
								onClick={handleClear}
								disabled={disabled}
								className="absolute inset-y-0 right-2 flex items-center text-muted hover:text-content disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<svg
									width="14"
									height="14"
									viewBox="0 0 14 14"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
									aria-hidden="true"
								>
									<path
										d="M2 2l10 10M12 2L2 12"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
									/>
								</svg>
							</button>
						)}
					</div>
				</Popover.Anchor>

				{/* Portal is always mounted (like FieldAutocomplete) so Radix can
				    register the anchor reference before `open` fires. The Root's
				    `open` prop drives visibility; Content is unmounted when closed. */}
				<Popover.Portal>
					<Popover.Content
						align="start"
						sideOffset={4}
						onOpenAutoFocus={e => e.preventDefault()}
						className={CONTENT_CLASS}
					>
						<ul role="listbox" id={listboxId} aria-label={label}>
							{showOptions &&
								options.map((opt, i) => (
									<li
										key={opt.value}
										id={`${id}-option-${i}`}
										role="option"
										aria-selected={value === opt.value}
									>
										<button
											type="button"
											// Prevent input blur so keyboard navigation is preserved
											onMouseDown={e => e.preventDefault()}
											onClick={() => handleSelect(opt)}
											className={`w-full text-left px-3 py-2 text-sm cursor-pointer ${
												i === activeIndex
													? 'bg-primary text-white'
													: value === opt.value
														? 'bg-muted-bg text-content font-medium'
														: 'text-content hover:bg-muted-bg'
											}`}
										>
											{opt.label}
										</button>
									</li>
								))}
							{showLoadError && (
								<li className="px-3 py-2 text-sm text-danger" role="option" aria-disabled="true">
									Could not load options
								</li>
							)}
							{showNoOptions && (
								<li
									className="px-3 py-2 text-sm text-muted"
									role="option"
									aria-disabled="true"
								>
									{noOptionsMessage}
								</li>
							)}
						</ul>
					</Popover.Content>
				</Popover.Portal>
			</Popover.Root>

			{error && <p id={errorId} className="mt-1 text-xs text-red-500" role="alert">{error}</p>}
		</div>
	);
}
