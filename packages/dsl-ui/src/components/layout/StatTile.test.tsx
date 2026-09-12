import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatTile } from './StatTile.js';

describe('StatTile', () => {
    it('renders the label', () => {
        render(<StatTile label="Total Revenue" value="$12,400" />);
        expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    });

    it('renders a string value', () => {
        render(<StatTile label="Revenue" value="$12,400" />);
        expect(screen.getByText('$12,400')).toBeInTheDocument();
    });

    it('renders a numeric value', () => {
        render(<StatTile label="Users" value={1024} />);
        expect(screen.getByText('1024')).toBeInTheDocument();
    });

    it('renders trend value and percentage when trend is provided', () => {
        render(<StatTile label="Sales" value={500} trend={{ value: 12, direction: 'up' }} />);
        expect(screen.getByText('12%')).toBeInTheDocument();
    });

    it('renders trend up arrow icon', () => {
        render(<StatTile label="Sales" value={500} trend={{ value: 12, direction: 'up' }} />);
        expect(screen.getByText('↑')).toBeInTheDocument();
    });

    it('applies green color class for trend up', () => {
        const { container } = render(<StatTile label="Sales" value={500} trend={{ value: 12, direction: 'up' }} />);
        const trendEl = container.querySelector('.text-success-text');
        expect(trendEl).toBeInTheDocument();
    });

    it('renders trend down arrow icon', () => {
        render(<StatTile label="Refunds" value={200} trend={{ value: 5, direction: 'down' }} />);
        expect(screen.getByText('↓')).toBeInTheDocument();
    });

    it('applies red color class for trend down', () => {
        const { container } = render(<StatTile label="Refunds" value={200} trend={{ value: 5, direction: 'down' }} />);
        const trendEl = container.querySelector('.text-danger-text');
        expect(trendEl).toBeInTheDocument();
    });

    it('applies muted color class for trend neutral', () => {
        const { container } = render(<StatTile label="Views" value={300} trend={{ value: 0, direction: 'neutral' }} />);
        const trendEl = container.querySelector('.text-muted');
        // muted is used both for label and neutral trend — check the trend section has the neutral arrow
        expect(screen.getByText('→')).toBeInTheDocument();
        expect(trendEl).toBeInTheDocument();
    });

    it('renders trend label when provided', () => {
        render(<StatTile label="Sales" value={500} trend={{ value: 12, direction: 'up', label: 'vs last month' }} />);
        expect(screen.getByText('vs last month')).toBeInTheDocument();
    });

    it('does not render trend section when trend is not provided', () => {
        const { container } = render(<StatTile label="Revenue" value="$0" />);
        // No arrow characters should be present
        expect(container.querySelector('.text-success-text')).not.toBeInTheDocument();
        expect(container.querySelector('.text-danger-text')).not.toBeInTheDocument();
    });

    it('renders icon when provided', () => {
        render(<StatTile label="Revenue" value="$0" icon={<span data-testid="test-icon">$</span>} />);
        expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });

    it('does not render icon container when icon is not provided', () => {
        const { container } = render(<StatTile label="Revenue" value="$0" />);
        // The icon wrapper div has w-6 h-6
        expect(container.querySelector('.w-6')).not.toBeInTheDocument();
    });

    it('shows skeleton loading state when loading=true', () => {
        render(<StatTile label="Revenue" value="$0" loading />);
        expect(screen.getByTestId('stat-tile-loading')).toBeInTheDocument();
        // Skeleton elements should be present
        expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
    });

    it('does not render label and value text while loading', () => {
        render(<StatTile label="Revenue" value="$12,400" loading />);
        expect(screen.queryByText('Revenue')).not.toBeInTheDocument();
        expect(screen.queryByText('$12,400')).not.toBeInTheDocument();
    });

    it('merges custom className', () => {
        const { container } = render(<StatTile label="Revenue" value="$0" className="col-span-2" />);
        expect(container.firstChild).toHaveClass('col-span-2');
    });
});
