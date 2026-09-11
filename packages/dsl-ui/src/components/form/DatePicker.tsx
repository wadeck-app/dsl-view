import React, { useEffect, useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { addMonths, eachDayOfInterval, endOfMonth, format, isAfter, isBefore, isEqual, isSameMonth, isSameYear, isToday, parse, startOfMonth, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const inputClass =
	'block w-full rounded border border-border bg-surface text-content px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed';

const CALENDAR_CLASS = 'z-50 bg-surface border border-border rounded shadow-md p-4 w-80';

export interface DatePickerProps {
	value: Date | null;
	onChange?: (date: Date | null) => void;
	onSelect?: (date: Date) => void;
	/** Function to determine if a date is disabled. Return true to disable. */
	isDateDisabled?: (date: Date) => boolean;
	minDate?: Date;
	maxDate?: Date;
	placeholder?: string;
	disabled?: boolean;
	dateFormat?: string;
}

/**
 * @registryCategory atomic
 * @registryTags field date calendar
 * @registryBind formData onChange
 */
export function DatePicker({
	value,
	onChange,
	onSelect,
	isDateDisabled,
	minDate,
	maxDate,
	placeholder = 'Select a date...',
	disabled,
	dateFormat = 'MMM d, yyyy',
}: DatePickerProps) {
	const [open, setOpen] = useState(false);
	const [displayMonth, setDisplayMonth] = useState<Date>(() => {
		if (value) return value;
		return new Date();
	});
	const [inputValue, setInputValue] = useState(() => {
		return value ? format(value, dateFormat) : '';
	});
	const focusedDateRef = useRef<Date | null>(value);
	const calendarRef = useRef<HTMLDivElement>(null);

	// Update input display when value changes externally
	useEffect(() => {
		setInputValue(value ? format(value, dateFormat) : '');
		if (value) {
			focusedDateRef.current = value;
		}
	}, [value, dateFormat]);

	// Update display month when value changes
	useEffect(() => {
		if (value && !isSameMonth(displayMonth, value)) {
			setDisplayMonth(value);
		}
	}, [value, displayMonth]);

	function isDisabledDate(date: Date): boolean {
		if (isDateDisabled?.(date)) return true;
		if (minDate && isBefore(date, startOfMonth(minDate))) return true;
		if (maxDate && isAfter(date, endOfMonth(maxDate))) return true;
		return false;
	}

	function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
		const text = e.target.value;
		setInputValue(text);

		// Try to parse input as date
		if (text.trim() === '') {
			onChange?.(null);
		} else {
			try {
				const parsed = parse(text, dateFormat, new Date());
				// Check if parsed date is valid
				if (!Number.isNaN(parsed.getTime())) {
					if (!isDisabledDate(parsed)) {
						onChange?.(parsed);
						setDisplayMonth(parsed);
					}
				}
			} catch {
				// Invalid format, keep as-is
			}
		}
	}

	function handleDateClick(date: Date) {
		if (isDisabledDate(date)) return;
		onChange?.(date);
		onSelect?.(date);
		setOpen(false);
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
		if (!focusedDateRef.current) return;

		const current = focusedDateRef.current;
		let nextDate: Date | null = null;

		switch (e.key) {
			case 'ArrowUp':
				e.preventDefault();
				nextDate = new Date(current.getFullYear(), current.getMonth(), current.getDate() - 7);
				break;
			case 'ArrowDown':
				e.preventDefault();
				nextDate = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 7);
				break;
			case 'ArrowLeft':
				e.preventDefault();
				nextDate = new Date(current.getFullYear(), current.getMonth(), current.getDate() - 1);
				break;
			case 'ArrowRight':
				e.preventDefault();
				nextDate = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
				break;
			case 'Enter':
				e.preventDefault();
				if (!isDisabledDate(current)) {
					handleDateClick(current);
				}
				break;
			case 'Escape':
				e.preventDefault();
				setOpen(false);
				break;
			default:
				break;
		}

		if (nextDate && !isDisabledDate(nextDate)) {
			focusedDateRef.current = nextDate;
			if (!isSameMonth(displayMonth, nextDate)) {
				setDisplayMonth(nextDate);
			}
			// Force re-render to show focus change
			setDisplayMonth(m => new Date(m));
		}
	}

	function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === 'ArrowDown' || e.key === 'Enter') {
			e.preventDefault();
			setOpen(true);
			focusedDateRef.current = value ?? new Date();
		} else if (e.key === 'Escape') {
			setOpen(false);
		}
	}

	const calendarDays = eachDayOfInterval({
		start: startOfMonth(displayMonth),
		end: endOfMonth(displayMonth),
	});

	// Get previous month days to fill first week
	const firstDayOfMonth = startOfMonth(displayMonth);
	const dayOfWeek = firstDayOfMonth.getDay();
	const prevMonthDays = Array.from({ length: dayOfWeek }, (_, i) => {
		return new Date(displayMonth.getFullYear(), displayMonth.getMonth(), -(dayOfWeek - i - 1));
	});

	// Get next month days to fill last week
	const lastDayOfMonth = endOfMonth(displayMonth);
	const lastDayOfWeek = lastDayOfMonth.getDay();
	const nextMonthDays = Array.from({ length: 6 - lastDayOfWeek }, (_, i) => {
		return new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, i + 1);
	});

	const allDays = [...prevMonthDays, ...calendarDays, ...nextMonthDays];
	const weeks = Array.from({ length: Math.ceil(allDays.length / 7) }, (_, i) =>
		allDays.slice(i * 7, (i + 1) * 7),
	);

	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			<Popover.Anchor asChild>
				<input
					type="text"
					value={inputValue}
					onChange={handleInputChange}
					onKeyDown={handleInputKeyDown}
					onFocus={() => !disabled && setOpen(true)}
					placeholder={placeholder}
					disabled={disabled}
					className={inputClass}
				/>
			</Popover.Anchor>
			<Popover.Portal>
				<Popover.Content
					align="start"
					sideOffset={8}
					onOpenAutoFocus={e => e.preventDefault()}
					className={CALENDAR_CLASS}
					onKeyDown={handleKeyDown}
					ref={calendarRef}
					tabIndex={-1}
				>
					<div className="space-y-4">
						{/* Header with month/year and navigation */}
						<div className="flex items-center justify-between">
							<button
								type="button"
								onClick={() => setDisplayMonth(subMonths(displayMonth, 1))}
								className="p-1 hover:bg-muted-bg rounded transition-colors"
								aria-label="Previous month"
							>
								<ChevronLeft className="w-4 h-4" />
							</button>
							<h2 className="font-semibold text-sm text-content">
								{format(displayMonth, 'MMMM yyyy')}
							</h2>
							<button
								type="button"
								onClick={() => setDisplayMonth(addMonths(displayMonth, 1))}
								className="p-1 hover:bg-muted-bg rounded transition-colors"
								aria-label="Next month"
							>
								<ChevronRight className="w-4 h-4" />
							</button>
						</div>

						{/* Weekday headers */}
						<div className="grid grid-cols-7 gap-1 text-center">
							{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
								<div key={day} className="text-xs font-medium text-muted h-8 flex items-center justify-center">
									{day}
								</div>
							))}
						</div>

						{/* Calendar grid */}
						<div className="grid grid-cols-7 gap-1">
							{allDays.map((date, idx) => {
								const isCurrentMonth = isSameMonth(date, displayMonth);
								const isSelected = value && isEqual(date, value);
								const isFocused = focusedDateRef.current && isEqual(date, focusedDateRef.current);
								const isDateDisabledState = isDisabledDate(date);
								const isTodayDate = isToday(date);

								return (
									<button
										key={idx}
										type="button"
										onClick={() => handleDateClick(date)}
										disabled={isDateDisabledState}
										className={`
											h-8 rounded text-sm font-medium transition-colors
											${!isCurrentMonth ? 'text-muted' : 'text-content'}
											${isSelected ? 'bg-primary text-primary-text' : ''}
											${isFocused && !isSelected ? 'ring-2 ring-primary' : ''}
											${isDateDisabledState ? 'opacity-50 cursor-not-allowed' : ''}
											${!isSelected && !isDateDisabledState && isCurrentMonth ? 'hover:bg-muted-bg cursor-pointer' : ''}
											${isTodayDate && !isSelected ? 'border-2 border-primary' : ''}
										`}
									>
										{format(date, 'd')}
									</button>
								);
							})}
						</div>

						{/* Optional: Today button */}
						<button
							type="button"
							onClick={() => {
								const today = new Date();
								if (!isDisabledDate(today)) {
									handleDateClick(today);
								}
							}}
							className="w-full py-2 text-sm text-primary hover:bg-muted-bg rounded transition-colors font-medium"
						>
							Today
						</button>
					</div>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}
