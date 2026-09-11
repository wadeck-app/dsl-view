import { eachDayOfInterval, endOfMonth, startOfMonth } from 'date-fns';

/**
 * Builds a 6-or-fewer row calendar grid for a given month.
 * Pads the first week with trailing days from the previous month and the last week with leading days from the next month.
 * Returns an array of weeks, each week being an array of 7 Date values.
 */
export function buildCalendarGrid(month: Date): Date[][] {
	const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });

	const firstDay = startOfMonth(month);
	const dayOfWeek = firstDay.getDay();
	const prevDays = Array.from({ length: dayOfWeek }, (_, i) =>
		new Date(month.getFullYear(), month.getMonth(), -(dayOfWeek - i - 1)),
	);

	const lastDay = endOfMonth(month);
	const lastDayOfWeek = lastDay.getDay();
	const nextDays = Array.from({ length: 6 - lastDayOfWeek }, (_, i) =>
		new Date(month.getFullYear(), month.getMonth() + 1, i + 1),
	);

	const allDays = [...prevDays, ...days, ...nextDays];
	return Array.from({ length: Math.ceil(allDays.length / 7) }, (_, i) =>
		allDays.slice(i * 7, (i + 1) * 7),
	);
}
