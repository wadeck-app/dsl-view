export function formatDateTime(iso: string): string {
	const date = new Date(iso);
	// Intl.DateTimeFormat throws a RangeError on an invalid date, which would take the whole page down for one bad cell.
	if (Number.isNaN(date.getTime())) {
		console.warn(`[formatDateTime] not a date: ${JSON.stringify(iso)}; showing it as is`);
		return iso;
	}
	return new Intl.DateTimeFormat('en-US', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}
