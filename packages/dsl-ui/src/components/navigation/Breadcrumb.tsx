import { Home } from 'lucide-react';
import React from 'react';
import { Button } from '../controls/_Button.js';
import { parseBreadcrumbSegments } from './breadcrumbSegments.js';

export interface BreadcrumbProps {
	currentPath: string;
	onNavigate: (path: string) => void;
}

/**
 * @registryCategory atomic
 * @registryTags navigation breadcrumb
 */
export function Breadcrumb({ currentPath, onNavigate }: BreadcrumbProps) {
	const segments = parseBreadcrumbSegments(currentPath);
	return (
		<>
			<Button variant="ghost" size="sm" onClick={() => onNavigate('/')} aria-label="Navigate to root">
				<Home className="h-4 w-4" aria-hidden="true" />
			</Button>
			{segments.map(({ label, path, isLast }) => (
				<React.Fragment key={path}>
					<span className="text-muted" aria-hidden="true">/</span>
					{isLast ? (
						<span className="font-medium text-content">{label}</span>
					) : (
						<Button variant="ghost" size="sm" onClick={() => onNavigate(path)} aria-label={`Navigate to ${path}`}>
							{label}
						</Button>
					)}
				</React.Fragment>
			))}
		</>
	);
}
