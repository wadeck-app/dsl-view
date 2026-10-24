import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppLink, usableLinkTarget } from './AppLink.js';
import { Badge } from '../display/Badge.js';
import { StatTile } from '../layout/StatTile.js';

function Where() {
	const loc = useLocation();
	return <output data-testid="where">{loc.pathname + loc.search}</output>;
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('AppLink', () => {
	it('navigates through the router without a page load and stays a real anchor', () => {
		render(
			<MemoryRouter>
				<AppLink href="/modules/queue/history?status=failed">History</AppLink>
				<Where />
			</MemoryRouter>
		);
		const link = screen.getByRole('link', { name: 'History' });
		expect(link).toHaveAttribute('href', '/modules/queue/history?status=failed');
		// fireEvent.click returns false when the click's default action (a full navigation) was not prevented.
		expect(fireEvent.click(link)).toBe(false);
		expect(screen.getByTestId('where')).toHaveTextContent('/modules/queue/history?status=failed');
	});

	it('opens an external target in a new tab without leaking the opener', () => {
		render(<AppLink href="https://example.com/a" external>Docs</AppLink>);
		const link = screen.getByRole('link', { name: 'Docs' });
		expect(link).toHaveAttribute('target', '_blank');
		expect(link).toHaveAttribute('rel', 'noopener noreferrer');
	});

	it('is a plain anchor, not a crash, where there is no router', () => {
		render(<AppLink href="/x">Plain</AppLink>);
		expect(screen.getByRole('link', { name: 'Plain' })).toHaveAttribute('href', '/x');
	});
});

describe('usableLinkTarget', () => {
	it('returns a valid target and nothing for an unset one, silently', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		expect(usableLinkTarget('/a', false, 'T')).toBe('/a');
		expect(usableLinkTarget(undefined, false, 'T')).toBeUndefined();
		expect(usableLinkTarget('', false, 'T')).toBeUndefined();
		expect(error).not.toHaveBeenCalled();
	});

	it('reports a bad target once, naming the component, and gives nothing back', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		expect(usableLinkTarget('javascript:alert(1)', false, 'LinkProbe')).toBeUndefined();
		expect(usableLinkTarget('javascript:alert(1)', false, 'LinkProbe')).toBeUndefined();
		expect(error).toHaveBeenCalledTimes(1);
		expect(error.mock.calls[0]![0]).toContain('[LinkProbe] href ignored');
	});
});

describe('StatTile href', () => {
	it('keeps the tile look and is not a link without href', () => {
		const { container } = render(<StatTile label="Failed" value={12} />);
		expect(screen.queryByRole('link')).toBeNull();
		expect(container.firstChild).toHaveClass('rounded-lg', 'bg-surface', 'border-border');
	});

	it('makes the whole tile one link named from its label and value, with the same look', () => {
		render(
			<MemoryRouter>
				<StatTile label="Failed" value={12} href="/modules/queue/history?status=failed" trend={{ value: 5, direction: 'up' }} />
				<Where />
			</MemoryRouter>
		);
		const link = screen.getByRole('link', { name: 'Failed: 12' });
		expect(link).toHaveAttribute('href', '/modules/queue/history?status=failed');
		expect(link).toHaveClass('rounded-lg', 'bg-surface', 'border-border', 'p-4', 'flex', 'flex-col');
		expect(link).toHaveClass('hover:border-primary');
		expect(link.className).toContain('focus-visible:ring-2');
		expect(link).toHaveTextContent('5%');
		fireEvent.click(link);
		expect(screen.getByTestId('where')).toHaveTextContent('/modules/queue/history?status=failed');
	});

	it('shows the skeleton, not a link, while loading', () => {
		render(
			<MemoryRouter>
				<StatTile label="Failed" value={12} href="/x" loading />
			</MemoryRouter>
		);
		expect(screen.queryByRole('link')).toBeNull();
		expect(screen.getByTestId('stat-tile-loading')).toBeInTheDocument();
	});

	it('renders a plain tile and logs an error for a target that is not an app path', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		render(<StatTile label="Bad" value={1} href="javascript:alert(1)" />);
		expect(screen.queryByRole('link')).toBeNull();
		expect(screen.getByText('Bad')).toBeInTheDocument();
		expect(error).toHaveBeenCalledWith(expect.stringContaining('[StatTile] href ignored'));
	});

	it('opens an external tile in a new tab', () => {
		render(<StatTile label="Docs" value="v1" href="https://example.com" external />);
		expect(screen.getByRole('link', { name: 'Docs: v1' })).toHaveAttribute('target', '_blank');
	});
});

describe('Badge href', () => {
	it('is a span without href and keeps the pill look as a link', () => {
		const { container, rerender } = render(<Badge label="Relay connected" variant="success" />);
		expect(container.firstElementChild?.tagName).toBe('SPAN');
		rerender(
			<MemoryRouter>
				<Badge label="Relay connected" variant="success" href="/modules/queue/webhooks" />
			</MemoryRouter>
		);
		const link = screen.getByRole('link', { name: 'Relay connected' });
		expect(link).toHaveAttribute('href', '/modules/queue/webhooks');
		expect(link).toHaveClass('inline-flex', 'rounded-full', 'bg-success', 'text-white', 'px-2');
		expect(link.className).toContain('hover:opacity-80');
		expect(link.className).toContain('focus-visible:ring-2');
	});

	it('is a span and logs an error for an unusable target', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const { container } = render(<Badge label="Nope" href="//evil.example" />);
		expect(container.firstElementChild?.tagName).toBe('SPAN');
		expect(error).toHaveBeenCalledWith(expect.stringContaining('[Badge] href ignored'));
	});
});
