/**
 * Normalizes an HTTP URL path to a structural form for contract matching.
 *
 * Both YAML-style {param} and route-style :param placeholders are replaced
 * by positional tokens :__p0, :__p1, … so that param name differences between
 * the YAML page and the contract key are irrelevant.
 *
 * Examples:
 *   /api/books/{id}        → /api/books/:__p0
 *   /api/books/:id         → /api/books/:__p0
 *   /api/tasks/:id/logs    → /api/tasks/:__p0/logs
 */
export function normalizeUrlStructure(url: string): string {
	// Strip leading HTTP method (e.g. "GET ", "POST ")
	const withoutMethod = url.replace(/^[A-Z]+\s+/, '');

	// Strip query string (? and everything after)
	const withoutQuery = withoutMethod.split('?')[0]!;

	let paramIndex = 0;
	return withoutQuery
		.split('/')
		.map((segment) => {
			if (segment.startsWith('{') && segment.endsWith('}')) {
				return `:__p${paramIndex++}`;
			}
			if (segment.startsWith(':')) {
				return `:__p${paramIndex++}`;
			}
			return segment;
		})
		.join('/');
}

/**
 * Converts a YAML-style URL to a route-style URL (:param form).
 * Does NOT normalize to positional form — preserves the original param names.
 *
 * /api/books/{bookId} → /api/books/:bookId
 */
export function yamlUrlToRouteStyle(url: string): string {
	const withoutMethod = url.replace(/^[A-Z]+\s+/, '');
	return withoutMethod.replace(/\{([^}]+)\}/g, ':$1');
}

/**
 * Extracts the HTTP method from a YAML URL string (e.g. "GET /api/books/" → "GET").
 * Returns undefined if no method prefix is present.
 */
export function extractMethod(url: string): string | undefined {
	const match = /^([A-Z]+)\s+/.exec(url);
	return match?.[1];
}

/**
 * Extracts the path portion from a YAML URL string (strips method prefix).
 */
export function extractPath(url: string): string {
	return url.replace(/^[A-Z]+\s+/, '');
}
