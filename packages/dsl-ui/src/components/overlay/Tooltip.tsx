import React from 'react';

// @formatter:off
// Intentionally theme-invariant (always dark bg + white text, unlike other
// surfaces which flip with the .dark class) - matches the pre-migration raw
// palette colors which had no dark-mode variant. Arbitrary hex values keep
// exact visual parity without introducing a new semantic token.
const tooltipClass = 'pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs rounded bg-[#111827] px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-normal text-center';
const arrowClass = 'absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#111827]';
// @formatter:on

export interface TooltipProps {
	content: string;
	/** @slot tag:atomic, tag:composite */
	children: React.ReactNode;
}

/**
 * @registryCategory disposition
 * @registryTags tooltip
 * @uiexception hover-only - Tooltips are intentionally hover-triggered; they cannot be permanently visible without defeating their purpose (screen real estate and visual noise). This is the sole accepted exception to UX §6.
 */
export function Tooltip({ content, children }: TooltipProps) {
	return (
		<span className="relative inline-flex group">
			{children}
			<span
				role="tooltip"
				className={tooltipClass}
			>
				{content}
				<span className={arrowClass} />
			</span>
		</span>
	);
}
