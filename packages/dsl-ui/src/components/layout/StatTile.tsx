import React from 'react';
import { Skeleton } from '../display/Skeleton.js';
import { AppLink, usableLinkTarget } from '../navigation/AppLink.js';

export interface StatTileTrend {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
}

export interface StatTileProps {
    label: string;
    value: string | number;
    trend?: StatTileTrend;
    icon?: React.ReactNode;
    /**
     * Skeleton instead of the value. Unset, it follows the page: true until the page's first load of `$sources` has finished.
     * @ctxDefault $initialLoading
     */
    loading?: boolean;
    className?: string;
    /**
     * Makes the whole tile a link (a drill-down from the number): an app path such as
     * `/modules/queue/history?status=failed`, navigated through the router without a page load. Ignored, with an
     * error in the console, when it is not an absolute app path (or an http(s)/mailto URL with `external`).
     */
    href?: string;
    /** Opens `href` as an external URL in a new tab. */
    external?: boolean;
}

const TREND_COLOR: Record<StatTileTrend['direction'], string> = {
    up: 'text-success-text',
    down: 'text-danger-text',
    neutral: 'text-muted',
};

const TREND_ICON: Record<StatTileTrend['direction'], string> = {
    up: '↑',
    down: '↓',
    neutral: '→',
};

// A link tile keeps the tile's look; hover and keyboard focus are the only additions.
const LINK_CLASSES =
    'no-underline transition-colors hover:border-primary hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-solid)]';

/**
 * @registryCategory disposition
 * @registryTags stat kpi metric dashboard
 */
export function StatTile({ label, value, trend, icon, loading = false, className = '', href, external = false }: StatTileProps) {
    const base = `rounded-lg bg-surface border border-border shadow-sm p-4 flex flex-col gap-2 ${className}`;
    const target = usableLinkTarget(href, external, 'StatTile');

    if (loading) {
        return (
            <div className={base} data-testid="stat-tile-loading">
                <Skeleton width="1.5rem" height="1.5rem" variant="block" />
                <Skeleton width="60%" height="0.75rem" />
                <Skeleton width="40%" height="1.5rem" />
                <Skeleton width="50%" height="0.75rem" />
            </div>
        );
    }

    const content = (
        <>
            {icon && (
                <div className="text-muted w-6 h-6 flex items-center justify-center">
                    {icon}
                </div>
            )}
            <p className="text-sm text-muted">{label}</p>
            <p className="text-2xl font-bold text-content">{value}</p>
            {trend && (
                <div className={`flex items-center gap-1 text-sm font-medium ${TREND_COLOR[trend.direction]}`}>
                    <span aria-hidden="true">{TREND_ICON[trend.direction]}</span>
                    <span>{trend.value}%</span>
                    {trend.label && <span className="text-muted font-normal">{trend.label}</span>}
                </div>
            )}
        </>
    );

    if (target) {
        return (
            <AppLink href={target} external={external} aria-label={`${label}: ${value}`} className={`${base} ${LINK_CLASSES}`}>
                {content}
            </AppLink>
        );
    }
    return <div className={base}>{content}</div>;
}
