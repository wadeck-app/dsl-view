import React from 'react';
import { Skeleton } from '../display/Skeleton.js';

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
    loading?: boolean;
    className?: string;
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

/**
 * @registryCategory layout
 * @registryTags stat kpi metric dashboard
 */
export function StatTile({ label, value, trend, icon, loading = false, className = '' }: StatTileProps) {
    const base = `rounded-lg bg-surface border border-border shadow-sm p-4 flex flex-col gap-2 ${className}`;

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

    return (
        <div className={base}>
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
        </div>
    );
}
