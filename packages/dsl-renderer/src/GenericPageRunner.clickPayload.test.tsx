import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { ComponentRegistryEntry } from './ComponentRegistry.js';
import { createRegistry } from './ComponentRegistry.js';
import { GenericPageRunner } from './GenericPageRunner.js';

// A header button wired like the shipped pages: `onClick: $ctx.<action>`. The click handler receives the React
// click event as its only argument; the named action must not take it for data.
const ButtonEntry: ComponentRegistryEntry = {
	name: 'Btn',
	category: 'atomic',
	tags: [],
	render: ({ node, ctx }) => {
		const onClick = ctx[node['handler'] as string] as (event: unknown) => Promise<unknown>;
		const shown = node['show'] === undefined ? undefined : JSON.stringify(ctx[node['show'] as string] ?? null);
		return (
			<div>
				<button
					onClick={event => {
						// Swallow the rejection like a React onClick would: the assertions look at the fetcher and the extras.
						void onClick(event).catch(() => undefined);
					}}
				>
					{String(node['label'])}
				</button>
				{shown === undefined ? null : <pre data-testid="shown">{shown}</pre>}
			</div>
		);
	},
};

const registry = createRegistry([ButtonEntry]);

function renderPage(yaml: string, fetcher: ReturnType<typeof vi.fn>) {
	return render(
		<MemoryRouter>
			<GenericPageRunner yamlText={yaml} registry={registry} fetcher={fetcher} brainRegistry={{}} />
		</MemoryRouter>
	);
}

describe('named action called by a button click', () => {
	it('sends the request without a body: the click event is not form data', async () => {
		const fetcher = vi.fn().mockResolvedValue({});
		renderPage(
			`
$actions:
  emptyTrash:
    url: POST /api/trash/empty
$type: Btn
label: Empty
handler: emptyTrash
`,
			fetcher
		);
		fireEvent.click(screen.getByRole('button', { name: 'Empty' }));
		await waitFor(() => {
			expect(fetcher).toHaveBeenCalledTimes(1);
		});
		const [url, params, body] = fetcher.mock.calls[0] as [string, unknown, unknown];
		expect(url).toBe('POST /api/trash/empty');
		expect(params).toBeUndefined();
		expect(body).toBeUndefined();
	});

	it('does not read URL placeholders from the click event', async () => {
		const fetcher = vi.fn().mockResolvedValue({});
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		renderPage(
			`
$actions:
  go:
    url: POST /api/things/{type}/run
$type: Btn
label: Go
handler: go
`,
			fetcher
		);
		fireEvent.click(screen.getByRole('button', { name: 'Go' }));
		await waitFor(() => {
			expect(fetcher).toHaveBeenCalledTimes(1);
		});
		// The click event carries a string `type` ("click"): it must not fill {type}.
		expect((fetcher.mock.calls[0] as [string])[0]).toBe('POST /api/things//run');
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('URL placeholder {type} has no value'));
	});

	it('still sends a plain object payload as the body and fills placeholders from it', async () => {
		const fetcher = vi.fn().mockResolvedValue({});
		const PayloadEntry: ComponentRegistryEntry = {
			name: 'Payload',
			category: 'atomic',
			tags: [],
			render: ({ ctx }) => (
				<button onClick={() => void (ctx['go'] as (payload: unknown) => Promise<unknown>)({ id: '7', name: 'x' })}>send</button>
			),
		};
		render(
			<MemoryRouter>
				<GenericPageRunner
					yamlText={`
$actions:
  go:
    url: PATCH /api/things/{id}
$type: Payload
`}
					registry={createRegistry([PayloadEntry])}
					fetcher={fetcher}
					brainRegistry={{}}
				/>
			</MemoryRouter>
		);
		fireEvent.click(screen.getByRole('button', { name: 'send' }));
		await waitFor(() => {
			expect(fetcher).toHaveBeenCalledTimes(1);
		});
		const [url, , body] = fetcher.mock.calls[0] as [string, unknown, unknown];
		expect(url).toBe('PATCH /api/things/7');
		expect(body).toStrictEqual({ id: '7', name: 'x' });
	});

	it('stores the timestamp marker, not the click event, for an action that only opens a dialog (resultKey)', async () => {
		const fetcher = vi.fn().mockResolvedValue({});
		renderPage(
			`
$actions:
  openCreate:
    resultKey: dialogTrigger
$type: Btn
label: Open
handler: openCreate
show: dialogTrigger
`,
			fetcher
		);
		expect(screen.getByTestId('shown').textContent).toBe('null');
		fireEvent.click(screen.getByRole('button', { name: 'Open' }));
		await waitFor(() => {
			expect(screen.getByTestId('shown').textContent).not.toBe('null');
		});
		const stored = JSON.parse(screen.getByTestId('shown').textContent ?? 'null') as Record<string, unknown>;
		expect(Object.keys(stored)).toStrictEqual(['_ts']);
		expect(typeof stored['_ts']).toBe('number');
		expect(fetcher).not.toHaveBeenCalled();
	});
});
