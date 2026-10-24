import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ComponentRegistryEntry } from './ComponentRegistry.js';
import { createRegistry } from './ComponentRegistry.js';
import { GenericPageRunner } from './GenericPageRunner.js';
import { renderChildren, resolveExpressionsDeep } from './engine/DslRenderer.js';

// The "validate then push" page of the queue module, built from the page-level pieces:
//  - `$vars: { payload: $sources.event.exampleText }` seeds an editable variable from a source value,
//  - a field outside any Form edits `$vars` through ctx.$setVar,
//  - an action with `resultKey` + `requestKey` stores the answer and the body the server accepted,
//  - `disabled: "!$validation.valid || $vars.payload != $validated.payload"` gates the second button.
// The registry entries are stand-ins that follow the documented ctx contract (the generated bind wrapper, tested in
// dsl-ui, reads and writes exactly these keys).
const FieldEntry: ComponentRegistryEntry = {
	name: 'VarField',
	category: 'atomic',
	tags: [],
	render: ({ node, ctx }) => {
		const bind = node['bind'] as string;
		const vars = ctx['$vars'] as Record<string, unknown>;
		const setVar = ctx['$setVar'] as (key: string, value: unknown) => void;
		return <textarea aria-label="Payload" value={String(vars[bind] ?? '')} onChange={event => setVar(bind, event.target.value)} />;
	},
};
// violations-suppress-start: react/no-raw-button test stand-ins for registry entries; dsl-renderer cannot import dsl-ui's Button
const ButtonEntry: ComponentRegistryEntry = {
	name: 'PageButton',
	category: 'atomic',
	tags: [],
	render: ({ node, ctx }) => {
		const onAction = ctx['onAction'] as (action: string, params: Record<string, unknown>, options?: { body?: unknown }) => void;
		const body = resolveExpressionsDeep(node['body'], ctx);
		const disabled = Boolean(resolveExpressionsDeep(node['disabled'], ctx));
		return (
			<button disabled={disabled} onClick={() => onAction(node['action'] as string, {}, body ? { body } : undefined)}>
				{node['label'] as string}
			</button>
		);
	},
};
const RefreshEntry: ComponentRegistryEntry = {
	name: 'ReloadSource',
	category: 'atomic',
	tags: [],
	render: ({ ctx }) => <button onClick={() => void (ctx['$refresh'] as (source?: string) => Promise<void>)('event')}>reload</button>,
};
// violations-suppress-end
const ShowEntry: ComponentRegistryEntry = {
	name: 'Show',
	category: 'atomic',
	tags: [],
	render: ({ node, ctx }) => <output data-testid={node['id'] as string}>{JSON.stringify(resolveExpressionsDeep(node['value'], ctx) ?? null)}</output>,
};
const GroupEntry: ComponentRegistryEntry = {
	name: 'Group',
	category: 'atomic',
	tags: [],
	render: ({ node, registry, ctx }) => <div>{renderChildren(node['items'] as unknown[], registry, ctx)}</div>,
};
const registry = createRegistry([FieldEntry, ButtonEntry, RefreshEntry, ShowEntry, GroupEntry]);

type Fetcher = (url: string, params?: Record<string, string>, body?: unknown, headers?: Record<string, string>) => Promise<unknown>;

const PAGE = `
$vars:
  payload: $sources.event.exampleText
  untouched: kept
$sources:
  event: GET /api/events/ping
$actions:
  validate:
    url: "POST /api/events/ping/validate-payload"
    resultKey: validation
    requestKey: validated
  push:
    url: "POST /api/events/ping/push-test"
$type: Group
items:
  - $type: VarField
    bind: payload
  - $type: PageButton
    label: Validate
    action: validate
    body:
      payload: $vars.payload
  - $type: PageButton
    label: Push
    action: push
    disabled: "!$validation.valid || $vars.payload != $validated.payload"
    body:
      payload: $vars.payload
  - $type: ReloadSource
  - $type: Show
    id: validated
    value: $validated
  - $type: Show
    id: vars
    value: $vars
  - $type: Show
    id: source
    value: $sources.event.exampleText
`;

function renderPage(fetcher: Fetcher, yaml = PAGE) {
	return render(
		<MemoryRouter>
			<GenericPageRunner yamlText={yaml} registry={registry} fetcher={fetcher} brainRegistry={{}} />
		</MemoryRouter>
	);
}

/** A fetcher serving the event source and the two POST routes; `exampleText` can change between loads. */
function makeFetcher(state: { exampleText: string; validate: () => unknown }) {
	return vi.fn<Fetcher>(async (url, _params, body) => {
		if (url.startsWith('GET /api/events/ping')) {
			return { exampleText: state.exampleText };
		}
		if (url.includes('validate-payload')) {
			return state.validate();
		}
		return { pushed: true, body };
	});
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('a variable declared with an expression is seeded from its source, once', () => {
	it('is empty while the source loads, then shows the source value', async () => {
		const state = { exampleText: '{"a":1}', validate: () => ({ valid: true }) };
		renderPage(makeFetcher(state));

		await waitFor(() => expect(screen.getByLabelText('Payload')).toHaveValue('{"a":1}'));
		expect(JSON.parse(screen.getByTestId('vars').textContent!)).toStrictEqual({ untouched: 'kept', payload: '{"a":1}' });
	});

	it('keeps the edit when the source is loaded again with a different text', async () => {
		const state = { exampleText: 'first', validate: () => ({ valid: true }) };
		renderPage(makeFetcher(state));
		await waitFor(() => expect(screen.getByLabelText('Payload')).toHaveValue('first'));

		fireEvent.change(screen.getByLabelText('Payload'), { target: { value: 'my edit' } });
		state.exampleText = 'second (from a reload)';
		fireEvent.click(screen.getByText('reload'));

		// The reload has landed when the page reads the new source text; the edit must have survived it.
		await waitFor(() => expect(screen.getByTestId('source').textContent).toBe('"second (from a reload)"'));
		expect(screen.getByLabelText('Payload')).toHaveValue('my edit');
	});

	it('a field edited before the source arrived is not overwritten by it', async () => {
		let release!: () => void;
		const gate = new Promise<void>(resolve => {
			release = resolve;
		});
		const fetcher = vi.fn<Fetcher>(async url => {
			if (url.startsWith('GET /api/events/ping')) {
				await gate;
				return { exampleText: 'late source value' };
			}
			return {};
		});
		renderPage(fetcher);

		fireEvent.change(screen.getByLabelText('Payload'), { target: { value: 'typed early' } });
		await act(async () => {
			release();
			await gate;
		});

		await waitFor(() => expect(fetcher).toHaveBeenCalled());
		expect(screen.getByLabelText('Payload')).toHaveValue('typed early');
	});
});

describe('requestKey: the body the server accepted', () => {
	it('is undefined until a call succeeded, and the Push button starts disabled', async () => {
		const state = { exampleText: '{"a":1}', validate: () => ({ valid: true }) };
		renderPage(makeFetcher(state));
		await waitFor(() => expect(screen.getByLabelText('Payload')).toHaveValue('{"a":1}'));

		expect(screen.getByTestId('validated').textContent).toBe('null');
		expect(screen.getByText('Push')).toBeDisabled();
		expect(screen.getByText('Validate')).toBeEnabled();
	});

	it('after a successful validation it holds the sent body and the Push button is enabled', async () => {
		const state = { exampleText: '{"a":1}', validate: () => ({ valid: true }) };
		const fetcher = makeFetcher(state);
		renderPage(fetcher);
		await waitFor(() => expect(screen.getByLabelText('Payload')).toHaveValue('{"a":1}'));

		fireEvent.click(screen.getByText('Validate'));

		await waitFor(() => expect(screen.getByTestId('validated').textContent).toBe('{"payload":"{\\"a\\":1}"}'));
		expect(screen.getByText('Push')).toBeEnabled();
		const validateCall = fetcher.mock.calls.find(call => call[0].includes('validate-payload'))!;
		expect(validateCall[2]).toStrictEqual({ payload: '{"a":1}' });
	});

	it('editing after the validation disables Push again; validating the edit enables it', async () => {
		const state = { exampleText: '{"a":1}', validate: () => ({ valid: true }) };
		renderPage(makeFetcher(state));
		await waitFor(() => expect(screen.getByLabelText('Payload')).toHaveValue('{"a":1}'));
		fireEvent.click(screen.getByText('Validate'));
		await waitFor(() => expect(screen.getByText('Push')).toBeEnabled());

		fireEvent.change(screen.getByLabelText('Payload'), { target: { value: '{"a":2}' } });
		expect(screen.getByText('Push')).toBeDisabled();

		fireEvent.click(screen.getByText('Validate'));
		await waitFor(() => expect(screen.getByText('Push')).toBeEnabled());
		expect(screen.getByTestId('validated').textContent).toBe('{"payload":"{\\"a\\":2}"}');
	});

	it('an answer that says valid:false keeps Push disabled even though the call succeeded', async () => {
		const state = { exampleText: '{"a":1}', validate: () => ({ valid: false, errors: [{ path: '$.a', message: 'must be a string' }] }) };
		renderPage(makeFetcher(state));
		await waitFor(() => expect(screen.getByLabelText('Payload')).toHaveValue('{"a":1}'));

		fireEvent.click(screen.getByText('Validate'));

		await waitFor(() => expect(screen.getByTestId('validated').textContent).toBe('{"payload":"{\\"a\\":1}"}'));
		expect(screen.getByText('Push')).toBeDisabled();
	});

	it('a failed call clears the echoed body, so a previous success cannot leave Push enabled', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const failures = [false, true];
		const state = {
			exampleText: '{"a":1}',
			validate: () => {
				if (failures.shift()) {
					throw Object.assign(new Error('Daemon is not running'), { status: 503 });
				}
				return { valid: true };
			},
		};
		renderPage(makeFetcher(state));
		await waitFor(() => expect(screen.getByLabelText('Payload')).toHaveValue('{"a":1}'));
		fireEvent.click(screen.getByText('Validate'));
		await waitFor(() => expect(screen.getByText('Push')).toBeEnabled());

		fireEvent.click(screen.getByText('Validate'));

		await waitFor(() => expect(screen.getByTestId('validated').textContent).toBe('null'));
		expect(screen.getByText('Push')).toBeDisabled();
		expect(screen.getByRole('alert').textContent).toContain('Daemon is not running');
	});

	it('Push sends the edited payload as its body', async () => {
		const state = { exampleText: '{"a":1}', validate: () => ({ valid: true }) };
		const fetcher = makeFetcher(state);
		renderPage(fetcher);
		await waitFor(() => expect(screen.getByLabelText('Payload')).toHaveValue('{"a":1}'));
		fireEvent.click(screen.getByText('Validate'));
		await waitFor(() => expect(screen.getByText('Push')).toBeEnabled());

		fireEvent.click(screen.getByText('Push'));

		await waitFor(() => expect(fetcher.mock.calls.some(call => call[0].includes('push-test'))).toBe(true));
		const pushCall = fetcher.mock.calls.find(call => call[0].includes('push-test'))!;
		expect(pushCall[2]).toStrictEqual({ payload: '{"a":1}' });
	});
});

describe('requestKey as an action key', () => {
	it('is a known key: no "unknown action key" error for it', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		renderPage(vi.fn<Fetcher>().mockResolvedValue({ exampleText: 'x' }));
		await waitFor(() => expect(screen.getByLabelText('Payload')).toHaveValue('x'));
		expect(consoleError).not.toHaveBeenCalledWith(expect.stringContaining('unknown action key'));
	});
});
