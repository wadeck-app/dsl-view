export function formatDateTime(iso: string): string {
	return new Intl.DateTimeFormat('en-US', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}
