export interface BreadcrumbSegment {
	label: string;
	path: string;
	isLast: boolean;
}

export function parseBreadcrumbSegments(currentPath: string): BreadcrumbSegment[] {
	if (currentPath === '/' || currentPath === '') return [];
	const parts = currentPath.replace(/^\//, '').split('/').filter(Boolean);
	return parts.map((label, idx) => ({
		label,
		path: '/' + parts.slice(0, idx + 1).join('/'),
		isLast: idx === parts.length - 1,
	}));
}
