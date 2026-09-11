import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { buildCalendarGrid } from './calendarUtils.js';
import {
	addMonths,
	endOfMonth,
	endOfWeek,
	format,
	isAfter,
	isBefore,
	isEqual,
	isSameMonth,
	isToday,
	isWithinInterval,
	startOfMonth,
	startOfWeek,
	subDays,
	subMonths,
} from 'date-fns';
import { CalendarRange, ChevronLeft, ChevronRight, X } from 'lucide-react';

const triggerClass =
	'flex items-center gap-2 w-full rounded border border-border bg-surface text-content px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-left';

const PANEL_CLASS = 'z-50 bg-surface border border-border rounded shadow-md p-4';

export interface DateRange {
	from: Date | null;
	to: Date | null;
}

export interface DateRangePickerProps {
	value: DateRange;
	onChange?: (range: DateRange) => void;
	/** Overall disabled state - no interaction allowed */
	disabled?: boolean;
	/** Function to determine if a date is disabled. Return true to disable. */
	isDisabled?: (date: Date) => boolean;
	minDate?: Date;
	maxDate?: Date;
	placeholder?: string;
	dateFormat?: string;
}

type SelectionPhase = 'from' | 'to';

const PRESETS = [
	{ label: 'Today', key: 'today' },
	{ label: 'This Week', key: 'this-week' },
	{ label: 'This Month', key: 'this-month' },
	{ label: 'Last 30 Days', key: 'last-30' },
	{ label: 'Custom', key: 'custom' },
] as const;

type PresetKey = (typeof PRESETS)[number]['key'];

function getPresetRange(key: PresetKey): DateRange | null {
	const today = new Date();
	switch (key) {
		case 'today':
			return { from: today, to: today };
		case 'this-week':
			return { from: startOfWeek(today), to: endOfWeek(today) };
		case 'this-month':
			return { from: startOfMonth(today), to: endOfMonth(today) };
		case 'last-30':
			return { from: subDays(today, 29), to: today };
		case 'custom':
			// Custom means "let the user pick manually" — no preset range
			return null;
	}
}


function formatRange(range: DateRange, dateFormat: string): string {
	const { from, to } = range;
	if (!from && !to) return '';
	if (from && !to) return format(from, dateFormat);
	if (!from && to) return format(to, dateFormat);
	// Both set
	if (isEqual(from!, to!)) return format(from!, dateFormat);
	return `${format(from!, dateFormat)} – ${format(to!, dateFormat)}`;
}

/**
 * @registryCategory atomic
 * @registryTags field date range calendar
 * @registryBind formData onChange
 */
export function DateRangePicker({
	value,
	onChange,
	disabled,
	isDisabled,
	minDate,
	maxDate,
	placeholder = 'Select a date range...',
	dateFormat = 'MMM d, yyyy',
}: DateRangePickerProps) {
	const [open, setOpen] = useState(false);
	const [phase, setPhase] = useState<SelectionPhase>('from');
	// Pending "from" while user selects "to"
	const [pendingFrom, setPendingFrom] = useState<Date | null>(null);
	const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
	const [leftMonth, setLeftMonth] = useState<Date>(() => {
		// Show month of "from" if available; else current month
		return value.from ? startOfMonth(value.from) : startOfMonth(new Date());
	});
	const [activePreset, setActivePreset] = useState<PresetKey | null>(null);

	const rightMonth = addMonths(leftMonth, 1);

	function isDateOutOfBounds(date: Date): boolean {
		if (isDisabled?.(date)) return true;
		if (minDate && isBefore(date, minDate)) return true;
		if (maxDate && isAfter(date, maxDate)) return true;
		return false;
	}

	// The "effective range" shown: once 'from' is picked and user hovers, show preview
	function getDisplayRange(): DateRange {
		if (phase === 'to' && pendingFrom) {
			const hovered = hoveredDate;
			if (hovered) {
				return {
					from: isBefore(pendingFrom, hovered) ? pendingFrom : hovered,
					to: isBefore(pendingFrom, hovered) ? hovered : pendingFrom,
				};
			}
			return { from: pendingFrom, to: null };
		}
		return value;
	}

	function handleDateClick(date: Date) {
		if (isDateOutOfBounds(date)) return;

		if (phase === 'from') {
			// First click: set the 'from' anchor
			setPendingFrom(date);
			setPhase('to');
			onChange?.({ from: date, to: null });
		} else {
			// Second click: finalize range
			const from = pendingFrom!;
			const finalFrom = isBefore(date, from) ? date : from;
			const finalTo = isBefore(date, from) ? from : date;
			onChange?.({ from: finalFrom, to: finalTo });
			setPendingFrom(null);
			setPhase('from');
			setHoveredDate(null);
			setActivePreset(null);
			setOpen(false);
		}
	}

	function handlePreset(key: PresetKey) {
		setActivePreset(key);
		const range = getPresetRange(key);
		if (range) {
			onChange?.(range);
			setPendingFrom(null);
			setPhase('from');
			setHoveredDate(null);
			// Navigate left panel to show the 'from' month
			if (range.from) {
				setLeftMonth(startOfMonth(range.from));
			}
			setOpen(false);
		}
		// For 'custom': just leave the calendar open for manual selection
	}

	function handleClear(e: React.MouseEvent) {
		e.stopPropagation();
		onChange?.({ from: null, to: null });
		setPendingFrom(null);
		setPhase('from');
		setActivePreset(null);
	}

	function handleOpenChange(next: boolean) {
		setOpen(next);
		if (!next) {
			// Cancel pending selection on close
			setPhase('from');
			setPendingFrom(null);
			setHoveredDate(null);
		}
	}

	const displayRange = getDisplayRange();
	const hasValue = value.from !== null || value.to !== null;
	const triggerText = hasValue ? formatRange(value, dateFormat) : null;

	return (
		<Popover.Root open={open} onOpenChange={handleOpenChange}>
			<Popover.Trigger asChild>
				<button
					type="button"
					disabled={disabled}
					aria-label={triggerText ?? placeholder}
					aria-haspopup="dialog"
					aria-expanded={open}
					className={triggerClass}
				>
					<CalendarRange className="w-4 h-4 text-muted shrink-0" aria-hidden="true" />
					<span className={`flex-1 truncate ${triggerText ? 'text-content' : 'text-muted'}`}>
						{triggerText ?? placeholder}
					</span>
					{hasValue && !disabled && (
						<span
							role="button"
							tabIndex={0}
							aria-label="Clear date range"
							onClick={handleClear}
							onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClear(e as unknown as React.MouseEvent); } }}
							className="p-0.5 hover:bg-muted-bg rounded transition-colors"
						>
							<X className="w-3.5 h-3.5 text-muted" />
						</span>
					)}
				</button>
			</Popover.Trigger>

			<Popover.Portal>
				<Popover.Content
					align="start"
					sideOffset={8}
					onOpenAutoFocus={e => e.preventDefault()}
					className={`${PANEL_CLASS} flex gap-0`}
					role="dialog"
					aria-label="Date range picker"
				>
					{/* Preset sidebar */}
					<div className="flex flex-col gap-1 pr-4 border-r border-border min-w-[120px]">
						<p className="text-xs font-semibold text-muted mb-1 uppercase tracking-wide">Presets</p>
						{PRESETS.map(({ label, key }) => (
							<button
								key={key}
								type="button"
								onClick={() => handlePreset(key)}
								className={`
									text-left text-sm px-3 py-1.5 rounded transition-colors font-medium
									${activePreset === key
										? 'bg-primary text-primary-text'
										: 'text-content hover:bg-muted-bg'
									}
								`}
							>
								{label}
							</button>
						))}
					</div>

					{/* Dual calendar panels */}
					<div className="flex gap-4 pl-4">
						<CalendarPanel
							month={leftMonth}
							onPrev={() => setLeftMonth(subMonths(leftMonth, 1))}
							onNext={() => setLeftMonth(addMonths(leftMonth, 1))}
							showPrev={true}
							showNext={false}
							displayRange={displayRange}
							onDateClick={handleDateClick}
							onDateHover={date => phase === 'to' && setHoveredDate(date)}
							onDateLeave={() => setHoveredDate(null)}
							isDateOutOfBounds={isDateOutOfBounds}
						/>
						<CalendarPanel
							month={rightMonth}
							onPrev={() => setLeftMonth(subMonths(leftMonth, 1))}
							onNext={() => setLeftMonth(addMonths(leftMonth, 1))}
							showPrev={false}
							showNext={true}
							displayRange={displayRange}
							onDateClick={handleDateClick}
							onDateHover={date => phase === 'to' && setHoveredDate(date)}
							onDateLeave={() => setHoveredDate(null)}
							isDateOutOfBounds={isDateOutOfBounds}
						/>
					</div>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}

// ---------------------------------------------------------------------------
// Internal CalendarPanel
// ---------------------------------------------------------------------------

interface CalendarPanelProps {
	month: Date;
	onPrev: () => void;
	onNext: () => void;
	showPrev: boolean;
	showNext: boolean;
	displayRange: DateRange;
	onDateClick: (date: Date) => void;
	onDateHover: (date: Date) => void;
	onDateLeave: () => void;
	isDateOutOfBounds: (date: Date) => boolean;
}

function CalendarPanel({
	month,
	onPrev,
	onNext,
	showPrev,
	showNext,
	displayRange,
	onDateClick,
	onDateHover,
	onDateLeave,
	isDateOutOfBounds,
}: CalendarPanelProps) {
	const weeks = buildCalendarGrid(month);
	const { from, to } = displayRange;

	function isInRange(date: Date): boolean {
		if (!from || !to) return false;
		// Avoid interval crash when from > to (shouldn't happen but guard anyway)
		if (isAfter(from, to)) return false;
		return isWithinInterval(date, { start: from, end: to });
	}

	function isRangeStart(date: Date): boolean {
		return from != null && isEqual(date, from);
	}

	function isRangeEnd(date: Date): boolean {
		return to != null && isEqual(date, to);
	}

	return (
		<div className="w-64 space-y-3">
			{/* Month header */}
			<div className="flex items-center justify-between">
				<button
					type="button"
					onClick={onPrev}
					aria-label="Previous month"
					disabled={!showPrev}
					className={`p-1 hover:bg-muted-bg rounded transition-colors ${!showPrev ? 'invisible pointer-events-none' : ''}`}
				>
					<ChevronLeft className="w-4 h-4" />
				</button>
				<h2 className="font-semibold text-sm text-content">
					{format(month, 'MMMM yyyy')}
				</h2>
				<button
					type="button"
					onClick={onNext}
					aria-label="Next month"
					disabled={!showNext}
					className={`p-1 hover:bg-muted-bg rounded transition-colors ${!showNext ? 'invisible pointer-events-none' : ''}`}
				>
					<ChevronRight className="w-4 h-4" />
				</button>
			</div>

			{/* Weekday headers */}
			<div className="grid grid-cols-7 gap-0 text-center">
				{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
					<div key={day} className="text-xs font-medium text-muted h-7 flex items-center justify-center">
						{day}
					</div>
				))}
			</div>

			{/* Calendar grid */}
			<div className="grid grid-cols-7 gap-0">
				{weeks.flat().map((date, idx) => {
					const isCurrentMonth = isSameMonth(date, month);
					const outOfBounds = isDateOutOfBounds(date);
					const rangeStart = isRangeStart(date);
					const rangeEnd = isRangeEnd(date);
					const inRange = isInRange(date);
					const isTodayDate = isToday(date);
					// A date can be both start and end (single-day range)
					const isSingleDay = rangeStart && rangeEnd;

					return (
						<div
							key={idx}
							className={`
								relative h-8 flex items-center justify-center
								${inRange && !rangeStart && !rangeEnd ? 'bg-primary/10' : ''}
								${rangeStart && !isSingleDay ? 'rounded-l-full bg-primary/10' : ''}
								${rangeEnd && !isSingleDay ? 'rounded-r-full bg-primary/10' : ''}
							`}
						>
							<button
								type="button"
								onClick={() => handleDateClick(date, outOfBounds, onDateClick)}
								onMouseEnter={() => !outOfBounds && onDateHover(date)}
								onMouseLeave={onDateLeave}
								disabled={outOfBounds}
								aria-label={format(date, 'MMMM d, yyyy')}
								aria-pressed={rangeStart || rangeEnd}
								className={`
									w-8 h-8 rounded-full text-sm font-medium transition-colors
									${!isCurrentMonth ? 'text-muted' : 'text-content'}
									${rangeStart || rangeEnd ? 'bg-primary text-primary-text' : ''}
									${isSingleDay ? 'rounded-full' : ''}
									${outOfBounds ? 'opacity-40 cursor-not-allowed' : ''}
									${!rangeStart && !rangeEnd && !outOfBounds && isCurrentMonth ? 'hover:bg-muted-bg cursor-pointer' : ''}
									${isTodayDate && !rangeStart && !rangeEnd ? 'border-2 border-primary' : ''}
								`}
							>
								{format(date, 'd')}
							</button>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function handleDateClick(date: Date, outOfBounds: boolean, onClick: (d: Date) => void) {
	if (outOfBounds) return;
	onClick(date);
}
