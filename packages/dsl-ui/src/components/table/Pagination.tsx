import { ChevronLeft, ChevronRight } from 'lucide-react';
import React from 'react';

import { Button } from '../controls/_Button.js';

export interface PaginationProps {
	page: number;
	onPageChange: (page: number) => void;
	total: number;
	size: number;
	// Required by the mechanical urlBackedPairs generator (every URL-backed value prop pairs with
	// a setter prop), but never called by Pagination itself - only PageSizeSelect ever mutates
	// `size`. A documented phantom prop rather than a bespoke read-only URL classifier.
	onSizeChange: (size: number) => void;
}

/**
 * @registryCategory atomic
 * @registryTags pagination
 */
export function Pagination({ page, onPageChange, total, size }: PaginationProps) {
	const totalPages = size > 0 ? Math.ceil(total / size) : 1;
	if (totalPages <= 1) return null;
	return (
		<div className="mt-3 flex items-center gap-2 text-sm text-muted">
			<Button
				variant="secondary"
				size="sm"
				onClick={() => onPageChange(page - 1)}
				disabled={page === 0}
				className="disabled:opacity-30"
			>
				<ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
				Prev
			</Button>
			<span>
				Page {page + 1} / {totalPages}
			</span>
			<Button
				variant="secondary"
				size="sm"
				onClick={() => onPageChange(page + 1)}
				disabled={page + 1 >= totalPages}
				className="disabled:opacity-30"
			>
				Next
				<ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
			</Button>
		</div>
	);
}
