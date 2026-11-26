// A page-header actions slot: the host (app-core) renders the slot in the title row, a module renders its actions into it with
// no measuring and no fixed offsets. Without a slot the actions are not shown, and that is said, not silent.
import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetReportedMessages } from '../dev/reportOnce.js';
import { HeaderActions, HeaderActionsProvider, HeaderActionsSlot } from './HeaderActions.js';

beforeEach(() => resetReportedMessages());
afterEach(() => vi.restoreAllMocks());

describe('HeaderActions', () => {
	it('renders the children inside the slot, not where HeaderActions is written', () => {
		render(
			<HeaderActionsProvider>
				<header data-testid="title-row">
					<h1>Allowed</h1>
					<HeaderActionsSlot />
				</header>
				<main data-testid="body">
					<HeaderActions>
						<button>Lock</button>
					</HeaderActions>
				</main>
			</HeaderActionsProvider>
		);
		expect(screen.getByTestId('title-row')).toContainElement(screen.getByRole('button', { name: 'Lock' }));
		expect(screen.getByTestId('body')).not.toContainElement(screen.getByRole('button', { name: 'Lock' }));
	});

	it('keeps the actions interactive state and updates them in place', () => {
		const onClick = vi.fn();
		const tree = (label: string) => (
			<HeaderActionsProvider>
				<HeaderActionsSlot />
				<HeaderActions>
					<button onClick={onClick}>{label}</button>
				</HeaderActions>
			</HeaderActionsProvider>
		);
		const { rerender } = render(tree('Lock'));
		const before = screen.getByRole('button', { name: 'Lock' });
		rerender(tree('Locked'));
		expect(screen.getByRole('button', { name: 'Locked' })).toBe(before);
	});

	it('removes the actions when the page that rendered them goes away', () => {
		const { rerender } = render(
			<HeaderActionsProvider>
				<HeaderActionsSlot />
				<HeaderActions>
					<button>Lock</button>
				</HeaderActions>
			</HeaderActionsProvider>
		);
		rerender(
			<HeaderActionsProvider>
				<HeaderActionsSlot />
			</HeaderActionsProvider>
		);
		expect(screen.queryByRole('button', { name: 'Lock' })).toBeNull();
	});

	it('shows the actions of a page rendered before the slot mounts, once it does', () => {
		function Host({ withSlot }: { withSlot: boolean }) {
			return (
				<HeaderActionsProvider>
					{withSlot && <HeaderActionsSlot />}
					<HeaderActions>
						<button>Lock</button>
					</HeaderActions>
				</HeaderActionsProvider>
			);
		}
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const { rerender } = render(<Host withSlot={false} />);
		expect(screen.queryByRole('button', { name: 'Lock' })).toBeNull();
		act(() => rerender(<Host withSlot />));
		expect(screen.getByRole('button', { name: 'Lock' })).toBeInTheDocument();
	});

	it('says so, once, when no slot is mounted (the actions are not shown)', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const { rerender } = render(
			<HeaderActionsProvider>
				<HeaderActions>
					<button>Lock</button>
				</HeaderActions>
			</HeaderActionsProvider>
		);
		rerender(
			<HeaderActionsProvider>
				<HeaderActions>
					<button>Lock</button>
				</HeaderActions>
			</HeaderActionsProvider>
		);
		const messages = [...warn.mock.calls, ...error.mock.calls].map(c => String(c[0]));
		expect(messages.filter(m => m.includes('[HeaderActions]'))).toHaveLength(1);
		expect(messages.find(m => m.includes('[HeaderActions]'))).toContain('HeaderActionsSlot');
	});

	it('says so when there is no provider at all', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		render(
			<HeaderActions>
				<button>Lock</button>
			</HeaderActions>
		);
		expect(screen.queryByRole('button', { name: 'Lock' })).toBeNull();
		const messages = [...warn.mock.calls, ...error.mock.calls].map(c => String(c[0]));
		expect(messages.some(m => m.includes('HeaderActionsProvider'))).toBe(true);
	});

	it('the slot is a plain flex row so the host can place and make it sticky', () => {
		render(
			<HeaderActionsProvider>
				<HeaderActionsSlot className="sticky top-0" />
			</HeaderActionsProvider>
		);
		const slot = screen.getByTestId('header-actions-slot');
		expect(slot).toHaveClass('flex', 'items-center', 'sticky', 'top-0');
	});
});
