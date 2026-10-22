import { ChevronLeft, ChevronRight } from 'lucide-react';
import React from 'react';

import { useOptionalUrlParam } from '../../context/UrlParamContext.js';
import { Button } from '../controls/_Button.js';

export interface PaginationProps {
	/**
	 * URL search param name backing the current page (0-based), e.g. "page". When set,
	 * Pagination reads/writes it directly via UrlParamContext (see useOptionalUrlParam) and
	 * `page`/`onPageChange` are ignored - this is what makes a page click actually trigger a
	 * `$sources` refetch, since useSourceLoader reacts to the URL, not to component state.
	 */
	urlParam?: string;
	/** Current page (0-based). Ignored when `urlParam` is set. */
	page?: number;
	/** Ignored when `urlParam` is set. */
	onPageChange?: (page: number) => void;
	total: number;
	size: number;
}

/**
 * @registryCategory atomic
 * @registryTags pagination
 */
export function Pagination({ urlParam, page, onPageChange, total, size }: PaginationProps) {
	const [urlPage, setUrlPage] = useOptionalUrlParam(urlParam);
	// total/size come from `$sources`: while they are not loaded yet there is nothing to paginate (and "Page NaN / NaN" to avoid).
	if (!Number.isFinite(total) || !Number.isFinite(size)) return null;
	const totalPages = size > 0 ? Math.ceil(total / size) : 1;
	const rawPage = urlParam ? Number(urlPage ?? 0) || 0 : page ?? 0;
	const activePage = Math.min(Math.max(rawPage, 0), totalPages - 1);
	const changePage = urlParam ? (next: number) => setUrlPage(String(Math.max(0, next))) : onPageChange;

	if (totalPages <= 1 || !changePage) return null;
	return (
		<div className="mt-3 flex items-center gap-2 text-sm text-muted">
			<Button
				variant="secondary"
				size="sm"
				onClick={() => changePage(activePage - 1)}
				disabled={activePage === 0}
				className="disabled:opacity-30"
			>
				<ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
				Prev
			</Button>
			<span>
				Page {activePage + 1} / {totalPages}
			</span>
			<Button
				variant="secondary"
				size="sm"
				onClick={() => changePage(activePage + 1)}
				disabled={activePage + 1 >= totalPages}
				className="disabled:opacity-30"
			>
				Next
				<ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
			</Button>
		</div>
	);
}
