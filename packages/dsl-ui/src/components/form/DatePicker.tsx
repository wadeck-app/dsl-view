import React, { useCallback, useEffect, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import {
	startOfMonth,
	endOfMonth,
	eachDayOfInterval,
	isSameMonth,
	isSameDay,
	format,
	addMonths,
	subMonths,
	getDay,
	isAfter,
	isBefore,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const inputClass =
	'block w-full rounded border border-border bg-surface text-content px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface DatePickerProps {
	/** The selected date value */
	value: Date | null;
	/** Called when date is selected */
	onChange: (date: Date | null) => void;
	/** Optional: predicate to determine if a date is disabled */
	isDisabled?: (date: Date) => boolean;
	/** Optional: minimum selectable date */
	minDate?: Date;
	/** Optional: maximum selectable date */
	maxDate?: Date;
	/** Optional: custom placeholder text */
	placeholder?: string;
	/** Optional: prevent date picker from opening */
	disabled?: boolean;
}

/**
 * Calendar component for date selection.
 * @internal Used by FieldDate; render this directly only for custom form wrappers.
 */
export function DatePicker({
	value,
	onChange,
	isDisabled,
	minDate,
	maxDate,
	placeholder = 'Select a date...',
	disabled = false,
}: DatePickerProps) {
	const [open, setOpen] = useState(false);
	const [displayMonth, setDisplayMonth] = useState<Date>(() => value ?? new Date());

	// Compute whether a date should be disabled based on all constraints
	const isDateDisabled = useCallback(
		(date: Date): boolean => {
			if (isDisabled?.(date)) return true;
			if (minDate && isBefore(date, minDate)) return true;
			if (maxDate && isAfter(date, maxDate)) return true;
			return false;
		},
		[isDisabled, minDate, maxDate],
	);

	// Update display month when value changes externally
	useEffect(() => {
		if (value) {
			setDisplayMonth(value);
		}
	}, [value]);

	const handlePrevMonth = () => {
		setDisplayMonth(prev => subMonths(prev, 1));
	};

	const handleNextMonth = () => {
		setDisplayMonth(prev => addMonths(prev, 1));
	};

	const handleSelectDate = (date: Date) => {
		if (!isDateDisabled(date)) {
			onChange(date);
			setOpen(false);
		}
	};

	const handleClear = (e: React.MouseEvent) => {
		e.stopPropagation();
		onChange(null);
		setOpen(false);
	};

	// Generate calendar days for the displayed month
	const monthStart = startOfMonth(displayMonth);
	const monthEnd = endOfMonth(displayMonth);
	const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

	// Compute leading empty cells (for days before month starts)
	const firstDayOfWeek = getDay(monthStart);
	const leadingEmptyCells = Array(firstDayOfWeek).fill(null);

	const formattedValue = value ? format(value, 'MMM d, yyyy') : placeholder;

	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			<Popover.Anchor asChild>
				<div className="relative w-full">
					<input
						type="text"
						readOnly
						value={formattedValue}
						placeholder={placeholder}
						disabled={disabled}
						className={`mt-1 ${inputClass} cursor-pointer`}
						onClick={() => !disabled && setOpen(true)}
						onKeyDown={e => {
							if (e.key === 'Enter') {
								!disabled && setOpen(true);
							} else if (e.key === 'Escape') {
								setOpen(false);
							}
						}}
						role="combobox"
						aria-expanded={open}
						aria-haspopup="dialog"
					/>
					{value && !disabled && (
						<button
							type="button"
							onClick={handleClear}
							className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted hover:text-content text-lg leading-none"
							aria-label="Clear date"
							tabIndex={-1}
						>
							×
						</button>
					)}
				</div>
			</Popover.Anchor>

			<Popover.Portal>
				<Popover.Content
					align="start"
					sideOffset={4}
					onOpenAutoFocus={e => e.preventDefault()}
					className="z-50 bg-surface border border-border rounded-lg shadow-lg p-4 w-80"
				>
					{/* Month/Year Header with Navigation */}
					<div className="flex items-center justify-between mb-4">
						<button
							type="button"
							onClick={handlePrevMonth}
							className="p-1 hover:bg-muted-bg rounded text-muted hover:text-content transition"
							aria-label="Previous month"
						>
							<ChevronLeft size={20} />
						</button>
						<h2 className="text-sm font-semibold text-content">
							{format(displayMonth, 'MMMM yyyy')}
						</h2>
						<button
							type="button"
							onClick={handleNextMonth}
							className="p-1 hover:bg-muted-bg rounded text-muted hover:text-content transition"
							aria-label="Next month"
						>
							<ChevronRight size={20} />
						</button>
					</div>

					{/* Weekday Labels */}
					<div className="grid grid-cols-7 gap-1 mb-2">
						{WEEKDAY_LABELS.map(label => (
							<div key={label} className="text-center text-xs font-medium text-muted h-8 flex items-center justify-center">
								{label}
							</div>
						))}
					</div>

					{/* Calendar Grid */}
					<div className="grid grid-cols-7 gap-1">
						{/* Leading empty cells */}
						{leadingEmptyCells.map((_, i) => (
							<div key={`empty-${i}`} className="h-8" />
						))}

						{/* Calendar days */}
						{calendarDays.map(date => {
							const isCurrentMonth = isSameMonth(date, displayMonth);
							const isSelected = value && isSameDay(date, value);
							const isDayDisabled = isDateDisabled(date);
							const isToday = isSameDay(date, new Date());

							return (
								<button
									key={format(date, 'yyyy-MM-dd')}
									type="button"
									onClick={() => handleSelectDate(date)}
									disabled={isDayDisabled}
									className={`
										h-8 rounded text-sm transition
										${!isCurrentMonth ? 'text-muted' : 'text-content'}
										${isDayDisabled ? 'cursor-not-allowed opacity-40 text-muted' : 'cursor-pointer hover:bg-muted-bg'}
										${isSelected ? 'bg-primary text-white font-semibold' : ''}
										${isToday && !isSelected ? 'border border-primary' : ''}
										${isCurrentMonth && !isDayDisabled && !isSelected ? 'hover:bg-muted-bg' : ''}
									`}
									aria-label={format(date, 'MMMM d, yyyy')}
									aria-selected={isSelected ?? false}
									aria-disabled={isDayDisabled}
								>
									{format(date, 'd')}
								</button>
							);
						})}
					</div>

					{/* Footer: Today button */}
					<div className="mt-4 pt-4 border-t border-border flex gap-2">
						<button
							type="button"
							onClick={() => handleSelectDate(new Date())}
							className="flex-1 px-3 py-2 text-sm font-medium text-primary hover:bg-muted-bg rounded transition"
						>
							Today
						</button>
						<button
							type="button"
							onClick={() => setOpen(false)}
							className="flex-1 px-3 py-2 text-sm text-muted hover:text-content hover:bg-muted-bg rounded transition"
						>
							Close
						</button>
					</div>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}
