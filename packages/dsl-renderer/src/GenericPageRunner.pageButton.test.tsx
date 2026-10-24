import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ComponentRegistryEntry } from './ComponentRegistry.js';
import { createRegistry } from './ComponentRegistry.js';
import { GenericPageRunner } from './GenericPageRunner.js';
import { renderChildren, resolveExpressionsDeep } from './engine/DslRenderer.js';

// Stand-in for a page-level button (dsl-ui's ActionButton): like its generated entry it resolves `params` and `body`
// deeply and calls ctx.onAction(action, params, { body }) without awaiting. `Show` prints what the page can read.
// violations-suppress-start: react/no-raw-button test stand-ins for registry entries; dsl-renderer cannot import dsl-ui's Button
const ButtonEntry: ComponentRegistryEntry = {
	name: 'PageButton',
	category: 'atomic',
	tags: [],
	render: ({ node, ctx }) => {
		const onAction = ctx['onAction'] as (action: string, params: Record<string, unknown>, options?: { body?: unknown }) => void;
		const params = resolveExpressionsDeep(node['params'], ctx) as Record<string, unknown>;
		const body = resolveExpressionsDeep(node['body'], ctx);
		return <button onClick={() => onAction(node['action'] as string, params ?? {}, body ? { body } : undefined)}>run</button>;
	},
};
// violations-suppress-end
const ShowEntry: ComponentRegistryEntry = {
	name: 'Show',
	category: 'atomic',
	tags: [],
	render: ({ node, ctx }) => <output data-testid="shown">{JSON.stringify(resolveExpressionsDeep(node['value'], ctx) ?? null)}</output>,
};
const GroupEntry: ComponentRegistryEntry = {
	name: 'Group',
	category: 'atomic',
	tags: [],
	render: ({ node, registry, ctx }) => <div>{renderChildren(node['items'] as unknown[], registry, ctx)}</div>,
};

const registry = createRegistry([ButtonEntry, ShowEntry, GroupEntry]);

type Fetcher = (url: string, params?: Record<string, string>, body?: unknown, headers?: Record<string, string>) => Promise<unknown>;

function renderPage(yaml: string, fetcher: Fetcher) {
	render(
		<MemoryRouter>
			<GenericPageRunner yamlText={yaml} registry={registry} fetcher={fetcher} brainRegistry={{}} />
		</MemoryRouter>
	);
}

const PAGE = `
$vars:
  payload: '{"a":1}'
$actions:
  validate:
    url: "POST /api/events/{name}/validate-payload"
    resultKey: validation
$type: Group
items:
  - $type: PageButton
    action: validate
    params:
      name: ping
    body:
      payload: $vars.payload
  - $type: Show
    value: $validation
`;

afterEach(() => {
	vi.restoreAllMocks();
});

describe('a page-level action call (ctx.onAction with params and a body)', () => {
	it('sends the body as the request body and fills the url from the params', async () => {
		const fetcher = vi.fn<Fetcher>().mockResolvedValue({ valid: true });
		renderPage(PAGE, fetcher);

		fireEvent.click(screen.getByText('run'));

		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
		// The 2nd argument still carries the legacy `{ id }` for hosts that read it: '' because params have no id.
		expect(fetcher.mock.calls[0]).toStrictEqual(['POST /api/events/ping/validate-payload', { id: '' }, { payload: '{"a":1}' }, undefined]);
	});

	it('stores the response under resultKey so the page reads it as $<resultKey>', async () => {
		renderPage(PAGE, vi.fn<Fetcher>().mockResolvedValue({ valid: false, errors: [{ path: '$.a', message: 'must be a string' }] }));
		expect(screen.getByTestId('shown').textContent).toBe('null');

		fireEvent.click(screen.getByText('run'));

		await waitFor(() => expect(screen.getByTestId('shown').textContent).toBe('{"valid":false,"errors":[{"path":"$.a","message":"must be a string"}]}'));
	});

	it('replaces the previous result by { error, status } when the call fails, and still reports the failure', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const failure = Object.assign(new Error('Daemon is not running'), { status: 503 });
		const fetcher = vi.fn<Fetcher>().mockResolvedValueOnce({ valid: true }).mockRejectedValueOnce(failure);
		renderPage(PAGE, fetcher);

		fireEvent.click(screen.getByText('run'));
		await waitFor(() => expect(screen.getByTestId('shown').textContent).toBe('{"valid":true}'));
		fireEvent.click(screen.getByText('run'));

		await waitFor(() => expect(screen.getByTestId('shown').textContent).toBe('{"error":"Daemon is not running","status":503}'));
		expect(screen.getByRole('alert').textContent).toContain('Daemon is not running');
	});

	it('also stores { error, status } when the call fails before any request (a missing url placeholder)', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const fetcher = vi.fn<Fetcher>().mockResolvedValue({ valid: true });
		renderPage(PAGE.replace('name: ping', 'other: 1'), fetcher);

		fireEvent.click(screen.getByText('run'));

		await waitFor(() => expect(screen.getByTestId('shown').textContent).toContain('URL placeholder {name} has no value'));
		expect(fetcher).not.toHaveBeenCalled();
	});
});
