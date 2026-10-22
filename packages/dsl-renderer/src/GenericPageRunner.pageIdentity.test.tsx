import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { ComponentRegistryEntry } from './ComponentRegistry.js';
import { createRegistry } from './ComponentRegistry.js';
import type { CompiledDslArtifact } from './compiledDslArtifact.js';
import { COMPILED_DSL_FORMAT_VERSION } from './compiledDslArtifact.js';
import { GenericPageRunner } from './GenericPageRunner.js';
import { computeRegistryFingerprint } from './registryHash.js';

// violations-suppress-start: react/no-raw-button test stand-in for a registry entry; dsl-renderer cannot import dsl-ui's Button
// Shows the page's $vars.search (undefined when the page declares no such var), the output published by the
// "type" button (page state the user changed at runtime) and the initialLoading flag.
const ProbeEntry: ComponentRegistryEntry = {
	name: 'Probe',
	category: 'atomic',
	tags: [],
	render: ({ ctx }) => {
		const vars = ctx['$vars'] as Record<string, unknown> | undefined;
		const publishOutput = ctx['$publishOutput'] as (id: string, name: string, value: unknown) => void;
		const outputs = ctx['$outputs'] as Record<string, Record<string, unknown>>;
		return (
			<div>
				<span data-testid="search">{vars?.['search'] === undefined ? 'undefined' : JSON.stringify(vars['search'])}</span>
				<span data-testid="typed">{String(outputs['probe']?.['typed'] ?? 'none')}</span>
				<span data-testid="loading">{String(ctx['$initialLoading'])}</span>
				<button onClick={() => publishOutput('probe', 'typed', 'yes')}>type</button>
			</div>
		);
	},
};
// violations-suppress-end

const registry = createRegistry([ProbeEntry]);

const JOBS = '$type: Probe\n$vars:\n  search: ""\n  filter: all\n';
const JOBS_NEW = '$type: Probe\n';

function compiledOf(sourcePath: string, doc: Record<string, unknown>): CompiledDslArtifact {
	return {
		formatVersion: COMPILED_DSL_FORMAT_VERSION,
		registryFingerprint: computeRegistryFingerprint(registry),
		sourcePath,
		doc,
		diagnostics: [],
	} as unknown as CompiledDslArtifact;
}

function Host({ yamlText, compiled, pageKey }: { yamlText?: string; compiled?: CompiledDslArtifact; pageKey?: string }) {
	return (
		<MemoryRouter initialEntries={['/modules/orchestrator/page']}>
			<GenericPageRunner
				yamlText={yamlText}
				compiled={compiled}
				pageKey={pageKey}
				registry={registry}
				fetcher={vi.fn().mockResolvedValue({})}
			/>
		</MemoryRouter>
	);
}

describe('GenericPageRunner page identity (same element, same route params, new document)', () => {
	it('applies the new page $vars defaults when yamlText changes', () => {
		const { rerender } = render(<Host yamlText={JOBS_NEW} />);
		expect(screen.getByTestId('search')).toHaveTextContent('undefined');

		rerender(<Host yamlText={JOBS} />);

		expect(screen.getByTestId('search')).toHaveTextContent('""');
	});

	it('does not leak the previous page vars or runtime state into the next page', () => {
		const { rerender } = render(<Host yamlText={JOBS} />);
		fireEvent.click(screen.getByText('type'));
		expect(screen.getByTestId('typed')).toHaveTextContent('yes');

		rerender(<Host yamlText={JOBS_NEW} />);

		expect(screen.getByTestId('search')).toHaveTextContent('undefined');
		expect(screen.getByTestId('typed')).toHaveTextContent('none');
	});

	it('applies the new page value when both pages declare the same var with different defaults', () => {
		const { rerender } = render(<Host yamlText={'$type: Probe\n$vars:\n  search: a\n'} />);
		expect(screen.getByTestId('search')).toHaveTextContent('"a"');

		rerender(<Host yamlText={'$type: Probe\n$vars:\n  search: b\n'} />);

		expect(screen.getByTestId('search')).toHaveTextContent('"b"');
	});

	it('resets the page state when going back to a page', () => {
		const { rerender } = render(<Host yamlText={JOBS} />);
		fireEvent.click(screen.getByText('type'));
		rerender(<Host yamlText={JOBS_NEW} />);

		rerender(<Host yamlText={JOBS} />);

		expect(screen.getByTestId('search')).toHaveTextContent('""');
		expect(screen.getByTestId('typed')).toHaveTextContent('none');
	});

	it('keeps the page state when the SAME document is re-rendered', () => {
		const { rerender } = render(<Host yamlText={JOBS} />);
		fireEvent.click(screen.getByText('type'));

		rerender(<Host yamlText={`${JOBS}`} />);

		expect(screen.getByTestId('typed')).toHaveTextContent('yes');
	});

	it('applies the new page $vars defaults when the compiled artifact changes', () => {
		const { rerender } = render(<Host compiled={compiledOf('pages/jobs-new.yaml', { $type: 'Probe' })} />);
		expect(screen.getByTestId('search')).toHaveTextContent('undefined');

		rerender(<Host compiled={compiledOf('pages/jobs.yaml', { $type: 'Probe', $vars: { search: '', filter: 'all' } })} />);

		expect(screen.getByTestId('search')).toHaveTextContent('""');
	});

	it('keeps the page state when an equal compiled artifact is passed as a new object', () => {
		const doc = { $type: 'Probe', $vars: { search: '' } };
		const { rerender } = render(<Host compiled={compiledOf('pages/jobs.yaml', doc)} />);
		fireEvent.click(screen.getByText('type'));

		rerender(<Host compiled={compiledOf('pages/jobs.yaml', { ...doc })} />);

		expect(screen.getByTestId('typed')).toHaveTextContent('yes');
	});

	it('pageKey decides the identity: same key keeps the state, a new key remounts', () => {
		const { rerender } = render(<Host yamlText={JOBS} pageKey="jobs" />);
		fireEvent.click(screen.getByText('type'));

		rerender(<Host yamlText={`${JOBS}# edited\n`} pageKey="jobs" />);
		expect(screen.getByTestId('typed')).toHaveTextContent('yes');

		rerender(<Host yamlText={JOBS} pageKey="jobs-2" />);
		expect(screen.getByTestId('typed')).toHaveTextContent('none');
	});

	it('resets initialLoading for the next page', async () => {
		const slow = '$type: Probe\n$sources:\n  data:\n    url: GET /api/data\n';
		const { rerender } = render(<Host yamlText={slow} />);
		await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

		rerender(<Host yamlText={`${slow}# second page\n`} />);

		// A remounted page starts loading again instead of inheriting the previous page's finished state.
		expect(screen.getByTestId('loading')).toHaveTextContent('true');
	});
});
