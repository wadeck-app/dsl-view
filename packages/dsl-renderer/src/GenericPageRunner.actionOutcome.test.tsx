// `ctx.onAction` settles with whether the action ran to its end: `true` on success, `false` when it failed (the notifier already told
// the user), was declined at its confirmation or was already running. A caller that must act only on success (a dialog button that
// closes after its action) reads it; callers that ignore the value are unchanged.
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createRegistry } from './ComponentRegistry.js';
import { GenericPageRunner } from './GenericPageRunner.js';

const seen: unknown[] = [];
// violations-suppress-start: react/no-raw-button test stand-in for a registry entry; dsl-renderer cannot import dsl-ui's Button
const registry = createRegistry([
	{
		name: 'Run',
		category: 'atomic',
		tags: [],
		render: ({ node, ctx }) => {
			const onAction = ctx['onAction'] as (action: string, params: Record<string, unknown>) => Promise<unknown>;
			return <button onClick={() => void onAction(node['action'] as string, {}).then(outcome => seen.push(outcome))}>run</button>;
		},
	},
]);
// violations-suppress-end

function page(actionYaml: string, fetcher: (url: string) => Promise<unknown>) {
	render(
		<MemoryRouter>
			<GenericPageRunner yamlText={`$actions:\n  go:\n${actionYaml}\n$type: Run\naction: go\n`} registry={registry} fetcher={fetcher} brainRegistry={{}} />
		</MemoryRouter>
	);
}

afterEach(() => {
	seen.length = 0;
	vi.restoreAllMocks();
});

describe('ctx.onAction outcome', () => {
	it('resolves true when the action succeeded', async () => {
		page('    url: "POST /api/go"', async () => ({}));
		fireEvent.click(screen.getByRole('button', { name: 'run' }));
		await waitFor(() => expect(seen).toEqual([true]));
	});

	it('resolves false when the request failed', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		page('    url: "POST /api/go"', async () => {
			throw new Error('boom');
		});
		fireEvent.click(screen.getByRole('button', { name: 'run' }));
		await waitFor(() => expect(seen).toEqual([false]));
	});

	it('resolves false when the user declines the confirmation', async () => {
		vi.spyOn(window, 'confirm').mockReturnValue(false);
		page('    url: "POST /api/go"\n    confirm: "Sure?"', async () => ({}));
		fireEvent.click(screen.getByRole('button', { name: 'run' }));
		await waitFor(() => expect(seen).toEqual([false]));
	});
});
