import React, { useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';

const triggerClass =
	'block w-full rounded border border-border bg-surface text-content px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed text-left';

const PANEL_CLASS = 'z-50 bg-surface border border-border rounded shadow-md p-4 w-56';

function parseTime(value: string | null): { hours: number; minutes: number } | null {
	if (!value) return null;
	const match = value.match(/^(\d{1,2}):(\d{2})$/);
	if (!match) return null;
	const hours = parseInt(match[1], 10);
	const minutes = parseInt(match[2], 10);
	if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
	return { hours, minutes };
}

function formatTimeValue(hours: number, minutes: number): string {
	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function formatDisplayTime(value: string | null, is12Hour: boolean): string {
	const parsed = parseTime(value);
	if (!parsed) return '';
	const { hours, minutes } = parsed;
	if (is12Hour) {
		const period = hours >= 12 ? 'PM' : 'AM';
		const h12 = hours % 12 === 0 ? 12 : hours % 12;
		return `${String(h12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
	}
	return formatTimeValue(hours, minutes);
}

export interface TimePickerProps {
	value: string | null;
	onChange?: (value: string | null) => void;
	is12Hour?: boolean;
	/** Increment step for minutes (default 1) */
	minuteStep?: number;
	disabled?: boolean;
	placeholder?: string;
}

/**
 * @registryCategory atomic
 * @registryTags field time clock
 * @registryBind formData onChange
 */
export function TimePicker({
	value,
	onChange,
	is12Hour = false,
	minuteStep = 1,
	disabled,
	placeholder = 'Select a time...',
}: TimePickerProps) {
	const [open, setOpen] = useState(false);
	const minuteSpinRef = useRef<HTMLDivElement>(null);

	const parsed = parseTime(value);
	const hours = parsed?.hours ?? 0;
	const minutes = parsed?.minutes ?? 0;
	const period = hours >= 12 ? 'PM' : 'AM';
	const displayHours = is12Hour ? (hours % 12 === 0 ? 12 : hours % 12) : hours;

	function emit(h: number, m: number) {
		onChange?.(formatTimeValue(h, m));
	}

	function incrementHours() {
		if (is12Hour) {
			// In 12h mode: 1→2→...→11→12→1, preserving AM/PM
			const h12 = hours % 12 === 0 ? 12 : hours % 12;
			const nextH12 = h12 === 12 ? 1 : h12 + 1;
			// PM block: hours 12–23; AM block: hours 0–11
			const newHours = hours >= 12
				? (nextH12 === 12 ? 12 : nextH12 + 12)
				: (nextH12 === 12 ? 0 : nextH12);
			emit(newHours, minutes);
		} else {
			emit((hours + 1) % 24, minutes);
		}
	}

	function decrementHours() {
		if (is12Hour) {
			// In 12h mode: 1→12→11→...→2→1, preserving AM/PM
			const h12 = hours % 12 === 0 ? 12 : hours % 12;
			const prevH12 = h12 === 1 ? 12 : h12 - 1;
			const newHours = hours >= 12
				? (prevH12 === 12 ? 12 : prevH12 + 12)
				: (prevH12 === 12 ? 0 : prevH12);
			emit(newHours, minutes);
		} else {
			emit((hours - 1 + 24) % 24, minutes);
		}
	}

	function incrementMinutes() {
		const nextM = minutes + minuteStep;
		if (nextM >= 60) {
			emit((hours + 1) % 24, 0);
		} else {
			emit(hours, nextM);
		}
	}

	function decrementMinutes() {
		const prevM = minutes - minuteStep;
		if (prevM < 0) {
			emit((hours - 1 + 24) % 24, 60 - minuteStep);
		} else {
			emit(hours, prevM);
		}
	}

	function togglePeriod() {
		if (hours < 12) {
			emit(hours + 12, minutes);
		} else {
			emit(hours - 12, minutes);
		}
	}

	function handleNow() {
		const now = new Date();
		let h = now.getHours();
		const rawM = now.getMinutes();
		let m = minuteStep > 1 ? Math.round(rawM / minuteStep) * minuteStep : rawM;
		if (m >= 60) {
			m = 0;
			h = (h + 1) % 24;
		}
		emit(h, m);
	}

	const displayValue = formatDisplayTime(value, is12Hour);

	return (
		<Popover.Root open={open} onOpenChange={v => { if (!disabled) setOpen(v); }}>
			<Popover.Anchor asChild>
				<button
					type="button"
					onClick={() => { if (!disabled) setOpen(v => !v); }}
					disabled={disabled}
					aria-haspopup="dialog"
					aria-expanded={open}
					aria-label={displayValue || placeholder}
					className={`${triggerClass} flex items-center gap-2`}
				>
					<Clock className="w-4 h-4 text-muted flex-shrink-0" aria-hidden="true" />
					<span className={displayValue ? '' : 'text-muted'}>
						{displayValue || placeholder}
					</span>
				</button>
			</Popover.Anchor>
			<Popover.Portal>
				<Popover.Content
					align="start"
					sideOffset={8}
					onOpenAutoFocus={e => e.preventDefault()}
					className={PANEL_CLASS}
					role="dialog"
					aria-label="Time picker"
				>
					<div className="flex flex-col gap-4">
						<div className="flex items-center justify-center gap-3">
							{/* Hours spinbutton */}
							<div className="flex flex-col items-center gap-1">
								<button
									type="button"
									onClick={incrementHours}
									className="p-1 hover:bg-muted-bg rounded transition-colors"
									aria-label="Increment hours"
									tabIndex={-1}
								>
									<ChevronUp className="w-4 h-4" />
								</button>
								<div
									role="spinbutton"
									aria-label="Hours"
									aria-valuenow={displayHours}
									aria-valuemin={is12Hour ? 1 : 0}
									aria-valuemax={is12Hour ? 12 : 23}
									aria-valuetext={String(displayHours).padStart(2, '0')}
									tabIndex={0}
									onKeyDown={e => {
										if (e.key === 'ArrowUp') { e.preventDefault(); incrementHours(); }
										else if (e.key === 'ArrowDown') { e.preventDefault(); decrementHours(); }
										else if (e.key === 'Tab' && !e.shiftKey) {
											e.preventDefault();
											minuteSpinRef.current?.focus();
										}
									}}
									className="w-12 h-10 flex items-center justify-center text-xl font-mono font-semibold text-content bg-muted-bg rounded cursor-default select-none focus:outline-none focus:ring-2 focus:ring-primary"
								>
									{String(displayHours).padStart(2, '0')}
								</div>
								<button
									type="button"
									onClick={decrementHours}
									className="p-1 hover:bg-muted-bg rounded transition-colors"
									aria-label="Decrement hours"
									tabIndex={-1}
								>
									<ChevronDown className="w-4 h-4" />
								</button>
							</div>

							<span className="text-2xl font-bold text-content select-none">:</span>

							{/* Minutes spinbutton */}
							<div className="flex flex-col items-center gap-1">
								<button
									type="button"
									onClick={incrementMinutes}
									className="p-1 hover:bg-muted-bg rounded transition-colors"
									aria-label="Increment minutes"
									tabIndex={-1}
								>
									<ChevronUp className="w-4 h-4" />
								</button>
								<div
									ref={minuteSpinRef}
									role="spinbutton"
									aria-label="Minutes"
									aria-valuenow={minutes}
									aria-valuemin={0}
									aria-valuemax={59}
									aria-valuetext={String(minutes).padStart(2, '0')}
									tabIndex={0}
									onKeyDown={e => {
										if (e.key === 'ArrowUp') { e.preventDefault(); incrementMinutes(); }
										else if (e.key === 'ArrowDown') { e.preventDefault(); decrementMinutes(); }
									}}
									className="w-12 h-10 flex items-center justify-center text-xl font-mono font-semibold text-content bg-muted-bg rounded cursor-default select-none focus:outline-none focus:ring-2 focus:ring-primary"
								>
									{String(minutes).padStart(2, '0')}
								</div>
								<button
									type="button"
									onClick={decrementMinutes}
									className="p-1 hover:bg-muted-bg rounded transition-colors"
									aria-label="Decrement minutes"
									tabIndex={-1}
								>
									<ChevronDown className="w-4 h-4" />
								</button>
							</div>

							{/* AM/PM toggle (12h mode only) */}
							{is12Hour && (
								<button
									type="button"
									onClick={togglePeriod}
									className="px-2 py-1 rounded bg-muted-bg text-content text-sm font-medium hover:bg-primary hover:text-primary-text transition-colors"
									aria-label={`Toggle period, currently ${period}`}
									aria-pressed={period === 'PM'}
								>
									{period}
								</button>
							)}
						</div>

						{/* Now shortcut */}
						<button
							type="button"
							onClick={handleNow}
							className="w-full py-2 text-sm text-primary hover:bg-muted-bg rounded transition-colors font-medium"
						>
							Now
						</button>
					</div>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}
