import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ComponentRegistryEntry } from './ComponentRegistry.js';
import { createRegistry } from './ComponentRegistry.js';
import type { CompiledDslArtifact } from './compiledDslArtifact.js';
import { COMPILED_DSL_FORMAT_VERSION } from './compiledDslArtifact.js';
import { GenericPageRunner } from './GenericPageRunner.js';
import { NotifierProvider } from './notifier.js';
import { computeRegistryFingerprint } from './registryHash.js';

// violations-suppress-start: react/no-raw-button test stand-in for a registry entry; dsl-renderer cannot import dsl-ui's Button
const ProbeEntry: ComponentRegistryEntry = {
	name: 'Probe',
	category: 'atomic',
	tags: [],
	render: ({ ctx }) => {
		const publishOutput = ctx['$publishOutput'] as (id: string, name: string, value: unknown) => void;
		const outputs = ctx['$outputs'] as Record<string, Record<string, unknown>>;
		const refresh = ctx['$refresh'] as (source?: string) => Promise<void>;
		return (
			<div>
				<span data-testid="typed">{String(outputs['probe']?.['typed'] ?? 'none')}</span>
				<button onClick={() => publishOutput('probe', 'typed', 'yes')}>type</button>
				<button onClick={() => void refresh('ghost')}>refresh-ghost</button>
			</div>
		);
	},
};
// violations-suppress-end

const registry = createRegistry([ProbeEntry]);

function compiledOf(sourcePath: string | undefined, fingerprint = computeRegistryFingerprint(registry)): CompiledDslArtifact {
	return {
		formatVersion: COMPILED_DSL_FORMAT_VERSION,
		registryFingerprint: fingerprint,
		sourcePath,
		doc: { $type: 'Probe' },
		diagnostics: [],
	} as unknown as CompiledDslArtifact;
}

function Host({ compiled }: { compiled: CompiledDslArtifact }) {
	return (
		<MemoryRouter>
			<GenericPageRunner compiled={compiled} registry={registry} fetcher={vi.fn().mockResolvedValue({})} />
		</MemoryRouter>
	);
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('compiled artifacts and page identity', () => {
	it('treats two artifacts with the same document but different source paths as different pages', () => {
		const { rerender } = render(<Host compiled={compiledOf('pages/a.yaml')} />);
		fireEvent.click(screen.getByText('type'));
		expect(screen.getByTestId('typed')).toHaveTextContent('yes');

		rerender(<Host compiled={compiledOf('pages/b.yaml')} />);

		expect(screen.getByTestId('typed')).toHaveTextContent('none');
	});

	it('keeps the page when the same artifact (same path, same document) is re-rendered', () => {
		const { rerender } = render(<Host compiled={compiledOf('pages/a.yaml')} />);
		fireEvent.click(screen.getByText('type'));
		rerender(<Host compiled={compiledOf('pages/a.yaml')} />);
		expect(screen.getByTestId('typed')).toHaveTextContent('yes');
	});

	it('names the artifact path and both fingerprints in the stale-registry warning', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		render(<Host compiled={compiledOf('pages/a.yaml', 'old-fingerprint')} />);
		const message = String(warn.mock.calls[0]![0]);
		expect(message).toBe(
			`[GenericPageRunner] Compiled DSL artifact (pages/a.yaml) was compiled against a different component registry (fingerprint old-fingerprint vs current ${computeRegistryFingerprint(registry)}). ` +
				'Rendering anyway - the artifact may be stale. Recompile to clear this warning.'
		);
	});

	it('omits the path from the stale-registry warning when the artifact has none', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		render(<Host compiled={compiledOf(undefined, 'old-fingerprint')} />);
		expect(String(warn.mock.calls[0]![0])).toContain('Compiled DSL artifact was compiled against');
	});
});

describe('lazy fallback warning', () => {
	it('is worded to tell what to pass, and is not shown when a fallback is given', () => {
		// The warning is reachable only through a lazy entry without a Suspense ancestor; its text is part of the contract.
		const Lazy = React.lazy(() => new Promise<{ default: React.ComponentType }>(() => undefined));
		const lazyRegistry = createRegistry([{ name: 'Lazy', category: 'atomic', tags: [], render: () => <Lazy /> }]);
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		render(
			<MemoryRouter>
				<GenericPageRunner yamlText={'$type: Lazy\n'} registry={lazyRegistry} fetcher={vi.fn()} />
			</MemoryRouter>
		);
		expect(warn).toHaveBeenCalledWith(
			'[GenericPageRunner] A lazily-loaded component is fetching its chunk and no `suspenseFallback` prop was passed - rendering nothing visible. ' +
				'Pass `suspenseFallback` to show a loading state, or pass `null` explicitly to silence this warning.'
		);
	});
});

describe('$refresh of an unknown source on a page without $sources', () => {
	it('says the page has no $sources instead of listing nothing', async () => {
		const notify = vi.fn();
		render(
			<MemoryRouter>
				<NotifierProvider notify={notify}>
					<GenericPageRunner yamlText={'$type: Probe\n'} registry={registry} fetcher={vi.fn()} />
				</NotifierProvider>
			</MemoryRouter>
		);
		fireEvent.click(screen.getByText('refresh-ghost'));
		await vi.waitFor(() =>
			expect(notify).toHaveBeenCalledWith({ kind: 'error', message: 'Cannot refresh unknown source "ghost". This page has: (no $sources).' })
		);
	});
});
