// URL representation of a persisted filter value.
//
// A list is its items joined by a literal comma ("failed,done"). Inside an item, the two characters that would be
// ambiguous are escaped as %25 (the percent sign) and %2C (the comma), so a single value that contains a comma
// ("Smith, John") stays ONE value instead of reading back as the list ["Smith", "John"]. URLSearchParams then
// percent-encodes the whole string for the address bar as usual.
//
// Values written before the escaping existed contain no %25/%2C sequences in practice, so they read back as before.

function escapeItem(item: string): string {
	return item.replace(/%/g, '%25').replace(/,/g, '%2C');
}

function unescapeItem(item: string): string {
	return item.replace(/%(25|2C)/gi, (_match, code: string) => (code === '25' ? '%' : ','));
}

export function encodeFilterValue(value: unknown): string {
	return Array.isArray(value) ? value.map(item => escapeItem(String(item))).join(',') : escapeItem(String(value));
}

// A raw value with a literal comma is a list (empty parts dropped); anything else is a single string.
export function decodeFilterValue(raw: string): string | string[] {
	return raw.includes(',') ? raw.split(',').filter(Boolean).map(unescapeItem) : unescapeItem(raw);
}
