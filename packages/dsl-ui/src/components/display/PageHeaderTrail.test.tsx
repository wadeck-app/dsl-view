// PageHeader placement: 'trail' moves the whole header (icon, the h1, headerActions) into the host's HeaderActionsSlot as one
// flex row; nothing stays in the page. Without a slot it renders in place, like 'page'. The slot says whether it holds content.
import { render, screen } from '@testing-library/react';
import { Folder } from 'lucide-react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetReportedMessages } from '../dev/reportOnce.js';
import { HeaderActions, HeaderActionsProvider, HeaderActionsSlot, useHeaderActionsFilled } from '../layout/HeaderActions.js';
import { PageHeader } from './PageHeader.js';

beforeEach(() => resetReportedMessages());
afterEach(() => vi.restoreAllMocks());

function Shell({ children }: { children: React.ReactNode }) {
	return (
		<HeaderActionsProvider>
			<header data-testid="title-row">
				<HeaderActionsSlot />
			</header>
			<main data-testid="body">{children}</main>
		</HeaderActionsProvider>
	);
}

describe('PageHeader placement="trail"', () => {
	it('portals icon, h1 and actions into the slot as one row and leaves nothing in the page', () => {
		render(
			<Shell>
				<PageHeader placement="trail" title="Machines" icon={Folder} headerActions={<button>Add</button>} />
			</Shell>
		);
		const slot = screen.getByTestId('header-actions-slot');
		expect(slot).toContainElement(screen.getByRole('heading', { level: 1, name: 'Machines' }));
		expect(slot).toContainElement(screen.getByRole('button', { name: 'Add' }));
		expect(screen.getByTestId('body')).toBeEmptyDOMElement();
		expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
	});

	it('renders the actions without an icon too', () => {
		render(
			<Shell>
				<PageHeader placement="trail" title="Machines" headerActions={<button>Add</button>} />
			</Shell>
		);
		expect(screen.getByTestId('header-actions-slot')).toContainElement(screen.getByRole('button', { name: 'Add' }));
		expect(screen.getByTestId('body')).toBeEmptyDOMElement();
	});

	it('renders in place, with one h1, when no slot is mounted', () => {
		render(
			<HeaderActionsProvider>
				<main data-testid="body">
					<PageHeader placement="trail" title="Machines" headerActions={<button>Add</button>} />
				</main>
			</HeaderActionsProvider>
		);
		expect(screen.getByTestId('body')).toContainElement(screen.getByRole('heading', { level: 1, name: 'Machines' }));
		expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
	});

	it('renders in place without any provider', () => {
		render(<PageHeader placement="trail" title="Machines" />);
		expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
	});

	it("'page' (the default) stays in place even when a slot exists", () => {
		render(
			<Shell>
				<PageHeader title="Machines" />
			</Shell>
		);
		expect(screen.getByTestId('body')).toContainElement(screen.getByRole('heading', { level: 1 }));
		expect(screen.getByTestId('header-actions-slot')).toBeEmptyDOMElement();
	});
});

describe('the slot reports whether it has content', () => {
	function Probe() {
		return <span data-testid="probe">{String(useHeaderActionsFilled())}</span>;
	}

	it('data-filled and useHeaderActionsFilled flip when content comes and goes', () => {
		const { rerender } = render(
			<HeaderActionsProvider>
				<HeaderActionsSlot />
				<Probe />
			</HeaderActionsProvider>
		);
		expect(screen.getByTestId('header-actions-slot')).toHaveAttribute('data-filled', 'false');
		expect(screen.getByTestId('probe')).toHaveTextContent('false');

		rerender(
			<HeaderActionsProvider>
				<HeaderActionsSlot />
				<Probe />
				<HeaderActions>
					<button>Lock</button>
				</HeaderActions>
			</HeaderActionsProvider>
		);
		expect(screen.getByTestId('header-actions-slot')).toHaveAttribute('data-filled', 'true');
		expect(screen.getByTestId('probe')).toHaveTextContent('true');

		rerender(
			<HeaderActionsProvider>
				<HeaderActionsSlot />
				<Probe />
			</HeaderActionsProvider>
		);
		expect(screen.getByTestId('header-actions-slot')).toHaveAttribute('data-filled', 'false');
		expect(screen.getByTestId('probe')).toHaveTextContent('false');
	});

	it('a trail PageHeader fills the slot', () => {
		render(
			<Shell>
				<PageHeader placement="trail" title="Machines" />
			</Shell>
		);
		expect(screen.getByTestId('header-actions-slot')).toHaveAttribute('data-filled', 'true');
	});

	it('is false without a provider', () => {
		render(<Probe />);
		expect(screen.getByTestId('probe')).toHaveTextContent('false');
	});
});
