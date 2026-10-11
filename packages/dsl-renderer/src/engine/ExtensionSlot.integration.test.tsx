import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createRegistry } from '../ComponentRegistry.js';
import type { ComponentRegistryEntry } from '../ComponentRegistry.js';
import { useSourceLoader } from '../pageRunner/useSourceLoader.js';
import type { RawSourceSpec } from '../pageRunner/pageRunnerUtils.js';
import { DslRenderer } from './DslRenderer.js';

// End-to-end check that ExtensionSlot works through the real $sources pipeline
// (useSourceLoader -> sourceData -> ctx), not just with items injected directly into ctx.
// Only the fetcher at the network boundary is mocked, matching useSourceLoader.test.ts's pattern.

const TextBox: ComponentRegistryEntry = {
	name: 'TextBox',
	category: 'atomic',
	tags: [],
	render: ({ node }) => <div data-testid="textbox">{node['text'] as string}</div>,
};

const registry = createRegistry([TextBox]);

const SOURCES_CONTRIBUTIONS: Record<string, RawSourceSpec> = {
	contributions: 'GET /api/slots/queue:subscriber-row/contributions',
};

function SlotPage({ fetcher }: { fetcher: ReturnType<typeof vi.fn> }) {
	const { sourceData, loading } = useSourceLoader({
		$sources: SOURCES_CONTRIBUTIONS,
		searchParams: new URLSearchParams(),
		fetcher,
	});

	if (loading) {
		return <div data-testid="loading">loading</div>;
	}

	return (
		<DslRenderer
			node={{ $type: 'ExtensionSlot', items: '$sources.contributions' }}
			registry={registry}
			ctx={sourceData}
		/>
	);
}

describe('ExtensionSlot + $sources integration', () => {
	it('renders DSL nodes fetched from the network as ExtensionSlot contributions', async () => {
		const fetcher = vi.fn().mockResolvedValue([
			{ $type: 'TextBox', text: 'from-module-a' },
			{ $type: 'TextBox', text: 'from-module-b' },
		]);

		render(<SlotPage fetcher={fetcher} />);

		await waitFor(() => {
			expect(screen.queryByTestId('loading')).toBeNull();
		});

		expect(fetcher).toHaveBeenCalledWith('GET /api/slots/queue:subscriber-row/contributions', undefined, undefined, undefined);
		const textboxes = screen.getAllByTestId('textbox');
		expect(textboxes).toHaveLength(2);
		expect(textboxes[0]).toHaveTextContent('from-module-a');
		expect(textboxes[1]).toHaveTextContent('from-module-b');
	});

	it('shows an alert when the endpoint returns a non-array (envelope) shape instead of a bare array', async () => {
		const fetcher = vi.fn().mockResolvedValue({ items: [{ $type: 'TextBox', text: 'wrapped' }] });

		render(<SlotPage fetcher={fetcher} />);

		await waitFor(() => {
			expect(screen.queryByTestId('loading')).toBeNull();
		});

		expect(screen.getByRole('alert')).toHaveTextContent(/did not resolve to an array/i);
	});
});
