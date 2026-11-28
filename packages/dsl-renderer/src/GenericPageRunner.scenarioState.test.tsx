// A host can open a page in a chosen state (a dialog already open, a counter at 5) without any user interaction: `scenarioState` seeds the
// page's `$vars` and the values that actions store under a `resultKey` (what `visible: $dialog` reads). Nothing else changes: the page
// is the real page, only its starting state differs.
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { createRegistry } from './ComponentRegistry.js';
import { resolveExpressionValue } from './engine/DslRenderer.js';
import { GenericPageRunner } from './GenericPageRunner.js';

const registry = createRegistry([
	{
		name: 'Show',
		category: 'atomic',
		tags: [],
		render: ({ node, ctx }) => <p data-testid="out">{JSON.stringify(resolveExpressionValue(node['value'], ctx) ?? null)}</p>,
	},
]);

function page(yaml: string, scenarioState?: Record<string, unknown>) {
	render(
		<MemoryRouter>
			<GenericPageRunner yamlText={yaml} registry={registry} fetcher={async () => ({})} brainRegistry={{}} scenarioState={scenarioState} />
		</MemoryRouter>
	);
	return () => JSON.parse(screen.getByTestId('out').textContent ?? 'null');
}

describe('scenarioState', () => {
	it('overrides a declared $var', () => {
		const out = page('$vars:\n  count: 1\n$type: Show\nvalue: $vars.count\n', { count: 5 });
		expect(out()).toBe(5);
	});

	it('keeps the declared value when the scenario does not mention it', () => {
		const out = page('$vars:\n  count: 1\n$type: Show\nvalue: $vars.count\n', { other: 2 });
		expect(out()).toBe(1);
	});

	it('seeds a name that is not a $var as an action result (what `visible: $dialog` reads)', () => {
		const out = page('$type: Show\nvalue: $dialog\n', { dialog: { id: 'a1' } });
		expect(out()).toEqual({ id: 'a1' });
	});

	it('changes nothing without it', () => {
		const out = page('$vars:\n  count: 1\n$type: Show\nvalue: $vars.count\n');
		expect(out()).toBe(1);
	});
});
