import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { ComponentRegistryEntry } from './ComponentRegistry.js';
import { createRegistry } from './ComponentRegistry.js';
import type { CompiledDslArtifact } from './compiledDslArtifact.js';
import { COMPILED_DSL_FORMAT_VERSION } from './compiledDslArtifact.js';
import { renderChildren, resolveExpressionValue } from './engine/DslRenderer.js';
import { GenericPageRunner } from './GenericPageRunner.js';
import { computeRegistryFingerprint } from './registryHash.js';

// Resolves its `value` with the REAL resolveExpressionValue (not a re-implementation) and prints it.
// violations-suppress-start: react/no-raw-button test stand-in for a registry entry; dsl-renderer cannot import dsl-ui's Button
const ProbeEntry: ComponentRegistryEntry = {
	name: 'Probe',
	category: 'atomic',
	tags: [],
	render: ({ node, ctx }) => {
		const resolved = resolveExpressionValue(node['value'], ctx);
		const publishOutput = ctx['$publishOutput'] as (id: string, name: string, value: unknown) => void;
		const outputs = ctx['$outputs'] as Record<string, Record<string, unknown>>;
		return (
			<div>
				<span data-testid="value">{resolved === undefined ? 'undefined' : JSON.stringify(resolved)}</span>
				<span data-testid="typed">{String(outputs['probe']?.['typed'] ?? 'none')}</span>
				<button onClick={() => publishOutput('probe', 'typed', 'yes')}>type</button>
			</div>
		);
	},
};
// violations-suppress-end

// Hands `props` to its children as `$props`, the way a component that renders a template does.
const WithPropsEntry: ComponentRegistryEntry = {
	name: 'WithProps',
	category: 'disposition',
	tags: [],
	render: ({ node, registry, ctx }) => {
		const props = node['props'] as Record<string, unknown>;
		return <div>{renderChildren(node['children'] as unknown[], registry, { ...ctx, $props: props })}</div>;
	},
};

const registry = createRegistry([ProbeEntry, WithPropsEntry]);

function Host({
	yamlText,
	compiled,
	pageKey,
	fetcher = vi.fn().mockResolvedValue({}),
	getToken,
	path = '/',
	pattern = '*',
}: {
	yamlText?: string;
	compiled?: CompiledDslArtifact;
	pageKey?: string;
	fetcher?: ReturnType<typeof vi.fn>;
	getToken?: () => Promise<string | null>;
	path?: string;
	pattern?: string;
}) {
	return (
		<MemoryRouter initialEntries={[path]}>
			<Routes>
				<Route
					path={pattern}
					element={
						<GenericPageRunner
							yamlText={yamlText}
							compiled={compiled}
							pageKey={pageKey}
							registry={registry}
							fetcher={fetcher}
							getToken={getToken}
						/>
					}
				/>
			</Routes>
		</MemoryRouter>
	);
}

const SOURCE_PAGE = '$type: Probe\nvalue: $sources.data\n$sources:\n  data:\n    url: GET /api/data\n';

describe('GenericPageRunner: getToken on source loads', () => {
	it('sends a bearer header with the token', async () => {
		const fetcher = vi.fn().mockResolvedValue({ ok: 1 });
		render(<Host yamlText={SOURCE_PAGE} fetcher={fetcher} getToken={async () => 'tok-1'} />);

		await waitFor(() => expect(screen.getByTestId('value')).toHaveTextContent('{"ok":1}'));
		expect(fetcher).toHaveBeenCalledTimes(1);
		expect(fetcher).toHaveBeenCalledWith('GET /api/data', undefined, undefined, { Authorization: 'Bearer tok-1' });
	});

	it.each([[null], ['']])('sends no header when the token is %j', async token => {
		const fetcher = vi.fn().mockResolvedValue({ ok: 1 });
		render(<Host yamlText={SOURCE_PAGE} fetcher={fetcher} getToken={async () => token} />);

		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
		expect(fetcher).toHaveBeenCalledWith('GET /api/data', undefined, undefined, undefined);
	});

	it('sends no header when the host gives no getToken', async () => {
		const fetcher = vi.fn().mockResolvedValue({ ok: 1 });
		render(<Host yamlText={SOURCE_PAGE} fetcher={fetcher} />);

		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
		expect(fetcher).toHaveBeenCalledWith('GET /api/data', undefined, undefined, undefined);
	});

	it('asks for the token once per source, so each request carries its own', async () => {
		const fetcher = vi.fn().mockResolvedValue({});
		const getToken = vi.fn().mockResolvedValueOnce('t-a').mockResolvedValueOnce('t-b');
		const yaml = '$type: Probe\n$sources:\n  a:\n    url: GET /api/a\n  b:\n    url: GET /api/b\n';
		render(<Host yamlText={yaml} fetcher={fetcher} getToken={getToken} />);

		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
		expect(getToken).toHaveBeenCalledTimes(2);
		const headers = fetcher.mock.calls.map(call => (call[3] as { Authorization: string }).Authorization).sort();
		expect(headers).toStrictEqual(['Bearer t-a', 'Bearer t-b']);
	});

	it('does not call the API when getToken rejects, and reports it', async () => {
		const fetcher = vi.fn().mockResolvedValue({ ok: 1 });
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		render(
			<Host
				yamlText={SOURCE_PAGE}
				fetcher={fetcher}
				getToken={async () => {
					throw new Error('token expired');
				}}
			/>
		);

		await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/token expired/));
		expect(fetcher).not.toHaveBeenCalled();
		expect(screen.getByTestId('value')).toHaveTextContent('undefined');
	});
});

describe('GenericPageRunner: $route through a real page', () => {
	const ROUTE_PAGE = (value: string) => `$type: Probe\nvalue: ${value}\n`;

	it('resolves a route param with the real resolver', () => {
		render(<Host yamlText={ROUTE_PAGE('$route.itemId')} path="/items/item-42" pattern="/items/:itemId" />);
		expect(screen.getByTestId('value')).toHaveTextContent('"item-42"');
	});

	it('resolves every param of the route, and an unknown one to undefined', () => {
		const { unmount } = render(<Host yamlText={ROUTE_PAGE('$route.sub')} path="/w/w1/s/s2" pattern="/w/:wid/s/:sub" />);
		expect(screen.getByTestId('value')).toHaveTextContent('"s2"');
		unmount();

		render(<Host yamlText={ROUTE_PAGE('$route.missing')} path="/w/w1/s/s2" pattern="/w/:wid/s/:sub" />);
		expect(screen.getByTestId('value')).toHaveTextContent('undefined');
	});

	it('exposes the whole params object, and an empty one on a route without params', () => {
		const { unmount } = render(<Host yamlText={ROUTE_PAGE('$route')} path="/w/w1" pattern="/w/:wid" />);
		expect(screen.getByTestId('value')).toHaveTextContent('{"wid":"w1"}');
		unmount();

		render(<Host yamlText={ROUTE_PAGE('$route')} path="/plain" pattern="/plain" />);
		expect(screen.getByTestId('value')).toHaveTextContent('{}');
	});

	it('feeds a route param into a source URL', async () => {
		const fetcher = vi.fn().mockResolvedValue({});
		const yaml = '$type: Probe\n$sources:\n  item:\n    url: GET /api/items/{id}\n    params:\n      id: $route.itemId\n';
		render(<Host yamlText={yaml} fetcher={fetcher} path="/items/item-42" pattern="/items/:itemId" />);

		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
		expect(fetcher).toHaveBeenCalledWith('GET /api/items/item-42', undefined, undefined, undefined);
	});

	it('a page-level $route key does not replace the route params', () => {
		const yaml = '$type: Probe\n$route: /items/:itemId\nvalue: $route.itemId\n';
		render(<Host yamlText={yaml} path="/items/item-42" pattern="/items/:itemId" />);
		expect(screen.getByTestId('value')).toHaveTextContent('"item-42"');
	});
});

describe('GenericPageRunner: $props through a real page', () => {
	it('a child of a component that provides $props reads them with the real resolver', () => {
		const yaml =
			'$type: WithProps\nprops:\n  label: Hello\n  nested:\n    n: 3\nchildren:\n  - $type: Probe\n    value: $props.label\n  - $type: Probe\n    value: $props.nested.n\n  - $type: Probe\n    value: $props.absent\n';
		render(<Host yamlText={yaml} />);

		expect(screen.getAllByTestId('value').map(el => el.textContent)).toStrictEqual(['"Hello"', '3', 'undefined']);
	});

	it('the page itself has no $props: the runner does not invent any', () => {
		render(<Host yamlText={'$type: Probe\nvalue: $props.label\n'} />);
		expect(screen.getByTestId('value')).toHaveTextContent('undefined');
	});
});

describe('GenericPageRunner: pageKey precedence', () => {
	function compiledOf(doc: Record<string, unknown>, sourcePath = 'pages/a.yaml'): CompiledDslArtifact {
		return {
			formatVersion: COMPILED_DSL_FORMAT_VERSION,
			registryFingerprint: computeRegistryFingerprint(registry),
			sourcePath,
			doc,
			diagnostics: [],
		} as unknown as CompiledDslArtifact;
	}

	it('with a pageKey, a different compiled document under the same key keeps the page state', () => {
		const { rerender } = render(<Host compiled={compiledOf({ $type: 'Probe', value: 'a' })} pageKey="k" />);
		fireEvent.click(screen.getByText('type'));
		expect(screen.getByTestId('typed')).toHaveTextContent('yes');

		rerender(<Host compiled={compiledOf({ $type: 'Probe', value: 'b' }, 'pages/b.yaml')} pageKey="k" />);

		// State kept AND the new document rendered: the key alone decides the identity.
		expect(screen.getByTestId('typed')).toHaveTextContent('yes');
		expect(screen.getByTestId('value')).toHaveTextContent('"b"');
	});

	it('a new pageKey remounts even when the document is byte-identical', () => {
		const { rerender } = render(<Host yamlText={'$type: Probe\n'} pageKey="one" />);
		fireEvent.click(screen.getByText('type'));

		rerender(<Host yamlText={'$type: Probe\n'} pageKey="two" />);

		expect(screen.getByTestId('typed')).toHaveTextContent('none');
	});

	it('an empty-string pageKey is still a key: it keeps the state while the document changes', () => {
		const { rerender } = render(<Host yamlText={'$type: Probe\nvalue: a\n'} pageKey="" />);
		fireEvent.click(screen.getByText('type'));

		rerender(<Host yamlText={'$type: Probe\nvalue: b\n'} pageKey="" />);

		expect(screen.getByTestId('typed')).toHaveTextContent('yes');
		expect(screen.getByTestId('value')).toHaveTextContent('"b"');
	});

	it('removing the pageKey falls back to the document identity', () => {
		const { rerender } = render(<Host yamlText={'$type: Probe\n'} pageKey="one" />);
		fireEvent.click(screen.getByText('type'));

		rerender(<Host yamlText={'$type: Probe\n'} />);

		expect(screen.getByTestId('typed')).toHaveTextContent('none');
	});
});
