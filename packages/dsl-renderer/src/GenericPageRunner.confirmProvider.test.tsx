// An action's `confirm` is asked through the host's ConfirmProvider when there is one (a styled dialog), and through window.confirm
// otherwise. The answer may arrive later (a dialog), so the request waits for it.
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConfirmProvider } from './confirm.js';
import { createRegistry } from './ComponentRegistry.js';
import { GenericPageRunner } from './GenericPageRunner.js';

// violations-suppress-start: react/no-raw-button test stand-in for a registry entry; dsl-renderer cannot import dsl-ui's Button
const registry = createRegistry([
	{
		name: 'Run',
		category: 'atomic',
		tags: [],
		render: ({ ctx }) => {
			const onAction = ctx['onAction'] as (action: string, params: Record<string, unknown>) => Promise<unknown>;
			return <button onClick={() => void onAction('go', {})}>run</button>;
		},
	},
]);
// violations-suppress-end

function page(confirm?: (message: string) => boolean | Promise<boolean>) {
	const fetcher = vi.fn(async () => ({}));
	const runner = (
		<MemoryRouter>
			<GenericPageRunner yamlText={'$actions:\n  go:\n    url: "POST /api/go"\n    confirm: "Delete it?"\n$type: Run\n'} registry={registry} fetcher={fetcher} brainRegistry={{}} />
		</MemoryRouter>
	);
	render(confirm ? <ConfirmProvider confirm={confirm}>{runner}</ConfirmProvider> : runner);
	return fetcher;
}

afterEach(() => vi.restoreAllMocks());

describe('confirm through the host', () => {
	it('asks the host with the action message and runs the action when it answers yes', async () => {
		const native = vi.spyOn(window, 'confirm');
		const confirm = vi.fn(async () => true);
		const fetcher = page(confirm);
		fireEvent.click(screen.getByRole('button', { name: 'run' }));
		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
		expect(confirm).toHaveBeenCalledWith('Delete it?');
		expect(native).not.toHaveBeenCalled();
	});

	it('does not send anything when the host answers no', async () => {
		const fetcher = page(async () => false);
		fireEvent.click(screen.getByRole('button', { name: 'run' }));
		await new Promise(resolve => setTimeout(resolve, 20));
		expect(fetcher).not.toHaveBeenCalled();
	});

	it('waits for a late answer', async () => {
		let answer: (yes: boolean) => void = () => undefined;
		const fetcher = page(() => new Promise<boolean>(resolve => { answer = resolve; }));
		fireEvent.click(screen.getByRole('button', { name: 'run' }));
		await new Promise(resolve => setTimeout(resolve, 20));
		expect(fetcher).not.toHaveBeenCalled();
		answer(true);
		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
	});

	it('falls back to window.confirm without a host', async () => {
		const native = vi.spyOn(window, 'confirm').mockReturnValue(true);
		const fetcher = page();
		fireEvent.click(screen.getByRole('button', { name: 'run' }));
		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
		expect(native).toHaveBeenCalledWith('Delete it?');
	});
});
