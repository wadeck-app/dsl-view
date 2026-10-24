import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';

import { FieldWrapper } from './FieldWrapper.js';
import { usableOptions } from '@dsl-ui/utils/usableOptions.js';

const inputClass =
	'block w-full rounded border border-border bg-surface text-content px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed';

const CONTENT_CLASS = 'z-50 w-[var(--radix-popover-trigger-width)] bg-surface border border-border rounded shadow-md max-h-60 overflow-y-auto';

const OPTION_CLASS = 'w-full text-left px-3 py-2 text-sm text-content hover:bg-muted-bg cursor-pointer';

const OPTION_ACTIVE_CLASS = 'bg-muted-bg';

/** No option is highlighted: Enter then keeps the typed text instead of choosing. */
const NO_ACTIVE_OPTION = -1;

export interface FieldAutocompleteOption {
	value: string;
	label: string;
}

export interface FieldAutocompleteProps {
	label: string;
	description?: string;
	options: FieldAutocompleteOption[];
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
}

/**
 * Text input with a filtered suggestion list (ARIA combobox: the input keeps the focus,
 * ArrowUp/ArrowDown move the highlighted option, Enter chooses it, Escape closes the list).
 *
 * @registryCategory atomic
 * @registryTags field autocomplete search
 * @registryBind formData onChange
 */
export function FieldAutocomplete({
	label,
	description,
	options: optionsProp,
	value,
	onChange,
	placeholder,
	disabled,
}: FieldAutocompleteProps) {
	// Memoised on the list itself: the sync effect below depends on `options`, a fresh array each render would loop it.
	const options = useMemo(() => usableOptions(optionsProp, 'FieldAutocomplete.options'), [optionsProp]);
	const [inputValue, setInputValue] = useState(() => {
		const match = options.find(o => o.value === value);
		return match ? match.label : value;
	});
	const [open, setOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(NO_ACTIVE_OPTION);
	const isSelectingRef = useRef(false);
	const listId = useId();

	useEffect(() => {
		const match = options.find(o => o.value === value);
		setInputValue(match ? match.label : value);
	}, [value, options]);

	function matchingOptions(text: string): FieldAutocompleteOption[] {
		return options.filter(o => o.label.toLowerCase().includes(text.toLowerCase()));
	}

	const filteredOptions = matchingOptions(inputValue);
	const optionId = (index: number) => `${listId}-option-${index}`;
	// The highlight can outlive the list it pointed into (options replaced while open).
	const activeOption = open && activeIndex < filteredOptions.length ? activeIndex : NO_ACTIVE_OPTION;

	useEffect(() => {
		if (activeOption === NO_ACTIVE_OPTION) {
			return;
		}
		// jsdom has no scrollIntoView; real browsers keep the highlighted option visible.
		document.getElementById(optionId(activeOption))?.scrollIntoView?.({ block: 'nearest' });
	});

	function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
		const text = e.target.value;
		setInputValue(text);
		setActiveIndex(NO_ACTIVE_OPTION);
		// Decide from the NEW text: filteredOptions still reflects the previous keystroke.
		setOpen(text.length > 0 && matchingOptions(text).length > 0);
	}

	function handleFocus() {
		if (!isSelectingRef.current && filteredOptions.length > 0) {
			setOpen(true);
		}
	}

	function handleSelect(opt: FieldAutocompleteOption) {
		isSelectingRef.current = true;
		setInputValue(opt.label);
		onChange(opt.value);
		setOpen(false);
		setActiveIndex(NO_ACTIVE_OPTION);
		setTimeout(() => { isSelectingRef.current = false; }, 100);
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			if (filteredOptions.length === 0) {
				return;
			}
			// Keep the caret where it is: the arrows move the highlight, not the cursor.
			e.preventDefault();
			if (!open) {
				setOpen(true);
				setActiveIndex(e.key === 'ArrowDown' ? 0 : filteredOptions.length - 1);
				return;
			}
			const step = e.key === 'ArrowDown' ? 1 : -1;
			// From "nothing highlighted", ArrowDown lands on the first and ArrowUp on the last option.
			const from = activeOption === NO_ACTIVE_OPTION ? (step === 1 ? -1 : filteredOptions.length) : activeOption;
			setActiveIndex((from + step + filteredOptions.length) % filteredOptions.length);
			return;
		}
		if (e.key === 'Enter' && activeOption !== NO_ACTIVE_OPTION) {
			// Choosing must not also submit the surrounding form.
			e.preventDefault();
			handleSelect(filteredOptions[activeOption]!);
			return;
		}
		if (e.key === 'Escape' && open) {
			setOpen(false);
			setActiveIndex(NO_ACTIVE_OPTION);
		}
	}

	return (
		<FieldWrapper label={label} description={description}>
			{control => (
				<Popover.Root open={open} onOpenChange={setOpen}>
					<Popover.Anchor asChild>
						<input
							{...control}
							type="text"
							role="combobox"
							aria-autocomplete="list"
							aria-expanded={open}
							aria-controls={open ? listId : undefined}
							aria-activedescendant={activeOption === NO_ACTIVE_OPTION ? undefined : optionId(activeOption)}
							value={inputValue}
							onChange={handleInputChange}
							onFocus={handleFocus}
							onKeyDown={handleKeyDown}
							placeholder={placeholder}
							disabled={disabled}
							className={`mt-1 ${inputClass}`}
							autoComplete="off"
						/>
					</Popover.Anchor>
					<Popover.Portal>
						<Popover.Content
							id={listId}
							role="listbox"
							aria-label={label}
							align="start"
							sideOffset={4}
							onOpenAutoFocus={e => e.preventDefault()}
							className={CONTENT_CLASS}
						>
							{filteredOptions.map((opt, index) => (
								<div
									key={opt.value}
									id={optionId(index)}
									role="option"
									aria-selected={opt.value === value}
									onMouseDown={e => e.preventDefault()}
									onClick={() => handleSelect(opt)}
									className={`${OPTION_CLASS} ${index === activeOption ? OPTION_ACTIVE_CLASS : ''}`}
								>
									{opt.label}
								</div>
							))}
						</Popover.Content>
					</Popover.Portal>
				</Popover.Root>
			)}
		</FieldWrapper>
	);
}
