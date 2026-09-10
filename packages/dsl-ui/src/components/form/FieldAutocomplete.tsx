import React, { useEffect, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';

import { FieldWrapper } from './FieldWrapper.js';

const inputClass =
	'block w-full rounded border border-border bg-surface text-content px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed';

const CONTENT_CLASS = 'z-50 w-[var(--radix-popover-trigger-width)] bg-surface border border-border rounded shadow-md max-h-60 overflow-y-auto';

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
 * @registryCategory atomic
 * @registryTags field autocomplete search
 * @registryBind formData onChange
 */
export function FieldAutocomplete({
	label,
	description,
	options,
	value,
	onChange,
	placeholder,
	disabled,
}: FieldAutocompleteProps) {
	const [inputValue, setInputValue] = useState(() => {
		const match = options.find(o => o.value === value);
		return match ? match.label : value;
	});
	const [open, setOpen] = useState(false);

	useEffect(() => {
		const match = options.find(o => o.value === value);
		setInputValue(match ? match.label : value);
	}, [value, options]);

	const filteredOptions = options.filter(o =>
		o.label.toLowerCase().includes(inputValue.toLowerCase()),
	);

	function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
		const text = e.target.value;
		setInputValue(text);
		setOpen(text.length > 0 && filteredOptions.length > 0);
	}

	function handleFocus() {
		if (filteredOptions.length > 0) setOpen(true);
	}

	function handleSelect(opt: FieldAutocompleteOption) {
		setInputValue(opt.label);
		onChange(opt.value);
		setOpen(false);
	}

	return (
		<FieldWrapper label={label} description={description}>
			<Popover.Root open={open} onOpenChange={setOpen}>
				<Popover.Anchor asChild>
					<input
						type="text"
						value={inputValue}
						onChange={handleInputChange}
						onFocus={handleFocus}
						placeholder={placeholder}
						disabled={disabled}
						className={`mt-1 ${inputClass}`}
						autoComplete="off"
					/>
				</Popover.Anchor>
				<Popover.Portal>
					<Popover.Content
						align="start"
						sideOffset={4}
						onOpenAutoFocus={e => e.preventDefault()}
						className={CONTENT_CLASS}
					>
						{filteredOptions.map(opt => (
							<button
								key={opt.value}
								type="button"
								onMouseDown={e => e.preventDefault()}
								onClick={() => handleSelect(opt)}
								className="w-full text-left px-3 py-2 text-sm text-content hover:bg-muted-bg cursor-pointer"
							>
								{opt.label}
							</button>
						))}
					</Popover.Content>
				</Popover.Portal>
			</Popover.Root>
		</FieldWrapper>
	);
}
