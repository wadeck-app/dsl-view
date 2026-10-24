import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RefreshButton } from './RefreshButton.js';

function deferred() {
	let resolve!: () => void;
	const promise = new Promise<void>(res => {
		resolve = res;
	});
	return { promise, resolve };
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('RefreshButton', () => {
	it('has an accessible name, default "Refresh", overridable with label', () => {
		const { rerender } = render(<RefreshButton onRefresh={vi.fn().mockResolvedValue(undefined)} />);
		expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
		rerender(<RefreshButton label="Reload events" onRefresh={vi.fn().mockResolvedValue(undefined)} />);
		expect(screen.getByRole('button', { name: 'Reload events' })).toBeInTheDocument();
	});

	it('calls onRefresh with the source, is disabled and aria-busy while it runs, then is usable again', async () => {
		const pending = deferred();
		const onRefresh = vi.fn().mockReturnValue(pending.promise);
		render(<RefreshButton source="history" onRefresh={onRefresh} />);

		fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
		expect(onRefresh).toHaveBeenCalledTimes(1);
		expect(onRefresh).toHaveBeenCalledWith('history');
		expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled();
		expect(screen.getByRole('button', { name: 'Refresh' })).toHaveAttribute('aria-busy', 'true');

		await act(async () => {
			pending.resolve();
		});
		expect(screen.getByRole('button', { name: 'Refresh' })).toBeEnabled();
		expect(screen.getByRole('button', { name: 'Refresh' })).not.toHaveAttribute('aria-busy');
	});

	it('without a source asks for every source of the page', () => {
		const onRefresh = vi.fn().mockResolvedValue(undefined);
		render(<RefreshButton onRefresh={onRefresh} />);
		fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
		expect(onRefresh).toHaveBeenCalledWith(undefined);
	});

	it('stays quiet when the refresh settles after the button unmounted', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const pending = deferred();
		const view = render(<RefreshButton onRefresh={vi.fn().mockReturnValue(pending.promise)} />);
		fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
		view.unmount();
		await act(async () => {
			pending.resolve();
		});
		expect(error).not.toHaveBeenCalled();
	});

	it('prefers onClick over onRefresh when both are given', () => {
		const onClick = vi.fn();
		const onRefresh = vi.fn().mockResolvedValue(undefined);
		render(<RefreshButton onClick={onClick} onRefresh={onRefresh} />);
		fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(onRefresh).not.toHaveBeenCalled();
	});

	it('spins only while busy', () => {
		const { container, rerender } = render(<RefreshButton onClick={vi.fn()} />);
		expect(container.querySelector('svg')!.getAttribute('class')).not.toMatch(/animate-spin/);
		rerender(<RefreshButton onClick={vi.fn()} loading />);
		expect(container.querySelector('svg')!.getAttribute('class')).toMatch(/animate-spin/);
		expect(screen.getByRole('button', { name: 'Refresh' })).toHaveAttribute('aria-busy', 'true');
	});

	it('keeps the legacy onClick / loading contract', () => {
		const onClick = vi.fn();
		const { rerender } = render(<RefreshButton onClick={onClick} />);
		fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
		expect(onClick).toHaveBeenCalledTimes(1);
		rerender(<RefreshButton onClick={onClick} loading />);
		expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled();
	});

	it('is loud and disabled when there is nothing to refresh (rendered outside a page)', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		render(<RefreshButton />);
		expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled();
		expect(error).toHaveBeenCalledWith(expect.stringContaining('Nothing to refresh'));
	});
});
