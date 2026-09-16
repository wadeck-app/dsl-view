import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { BackLink, BACK_ROW_CLS, BACK_LINK_CLS } from './BackLink.js';

function renderAt(path: string, props: { to?: string; label?: string } = {}) {
	return render(
		<MemoryRouter initialEntries={[path]}>
			<BackLink {...props} />
		</MemoryRouter>
	);
}

describe('BackLink', () => {
	it('defaults its label to Back', () => {
		renderAt('/jobs/j1/logs');

		expect(screen.getByRole('link', { name: 'Back' })).toBeInTheDocument();
	});

	it('takes an explicit label', () => {
		renderAt('/jobs/j1/logs', { label: 'Back to job' });

		expect(screen.getByRole('link', { name: 'Back to job' })).toBeInTheDocument();
	});

	// The default is what lets a page drop the link in without restating its own route.
	it('goes up one path segment when given no target', () => {
		renderAt('/jobs/j1/logs');

		expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/jobs/j1');
	});

	it('stops at the root rather than producing an empty href', () => {
		renderAt('/jobs');

		expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/');
	});

	it('prefers an explicit target over the derived one', () => {
		renderAt('/jobs/j1/logs', { to: '/audit' });

		expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/audit');
	});

	// These strings are exported so a page building its own header row lands on the same
	// baseline. A header that restated them drifted by 9px.
	it('exposes its row and link classes for headers with their own layout', () => {
		const { container } = renderAt('/jobs/j1/logs');

		expect((container.firstElementChild as HTMLElement).className).toBe(BACK_ROW_CLS);
		for (const cls of BACK_LINK_CLS.split(' ')) {
			expect(screen.getByRole('link', { name: 'Back' }).className).toContain(cls);
		}
	});

	// flex on the row is what removes a one-pixel offset against headers that wrap their
	// crumbs in a flex row; sticky keeps the link visible while a long page scrolls.
	it('keeps the row sticky and flex', () => {
		expect(BACK_ROW_CLS).toContain('sticky');
		expect(BACK_ROW_CLS).toContain('flex');
	});
});
