import { render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ComponentRegistryEntry } from '../ComponentRegistry.js';
import { createRegistry } from '../ComponentRegistry.js';
import { findUnknownKeys } from '../build/unknownKeys.js';
import { DslRenderer, renderChildren } from './DslRenderer.js';
import { resetUnknownKeyWarnings } from './warnUnknownKeys.js';

const StackEntry: ComponentRegistryEntry = {
	name: 'Stack',
	category: 'disposition',
	tags: [],
	knownKeys: ['gap', 'items'],
	allowedChildren: { items: ['atomic'] },
	render: ({ node, registry, ctx }) => <div data-testid="stack">{renderChildren(node['items'], registry, ctx)}</div>,
};

const LabelEntry: ComponentRegistryEntry = {
	name: 'Label',
	category: 'atomic',
	tags: [],
	knownKeys: ['text'],
	render: ({ node }) => <span>{String(node['text'] ?? '')}</span>,
};

const TableEntry: ComponentRegistryEntry = {
	name: 'Table',
	category: 'composite',
	tags: [],
	knownKeys: ['columns'],
	itemKeys: { columns: { keys: ['field', 'label'] } },
	render: () => <table />,
};

// A hand-written entry, like an app-local component: no knownKeys metadata.
const LocalEntry: ComponentRegistryEntry = {
	name: 'Local',
	category: 'atomic',
	tags: [],
	render: ({ node }) => <span>{String(node['title'] ?? '')}</span>,
};

const registry = createRegistry([StackEntry, LabelEntry, TableEntry, LocalEntry]);

let warn: ReturnType<typeof vi.spyOn>;
const warnings = () => warn.mock.calls.map(call => String(call[0]));

beforeEach(() => {
	resetUnknownKeyWarnings();
	warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('DslRenderer: unknown authored keys at runtime (development)', () => {
	it('warns about `children` under a container, suggests `items`, and still renders the node as before (empty)', () => {
		render(<DslRenderer node={{ $type: 'Stack', children: [{ $type: 'Label', text: 'hi' }] }} registry={registry} />);
		expect(screen.getByTestId('stack').textContent).toBe('');
		const message = warnings().find(m => m.includes('unknown key "children"'));
		expect(message).toContain('[DslRenderer] [Stack]');
		expect(message).toContain('Did you mean "items"?');
		expect(message).toContain('Known keys: gap, items');
		// A key on the node itself carries no position suffix.
		expect(message).not.toContain('(at ');
	});

	it('warns about a typo and suggests the closest known key', () => {
		render(<DslRenderer node={{ $type: 'Label', txt: 'hi' }} registry={registry} />);
		expect(warnings().some(m => m.includes('unknown key "txt"') && m.includes('Did you mean "text"?'))).toBe(true);
	});

	it('warns once per component type and key, however many nodes carry it', () => {
		render(
			<DslRenderer
				node={{ $type: 'Stack', items: [{ $type: 'Label', txt: 'a' }, { $type: 'Label', txt: 'b' }, { $type: 'Label', txt: 'c' }] }}
				registry={registry}
			/>
		);
		expect(warnings().filter(m => m.includes('unknown key "txt"'))).toHaveLength(1);
	});

	it('stays quiet for known keys and $-directives', () => {
		render(<DslRenderer node={{ $type: 'Stack', $id: 'root', gap: 'gap-2', items: [{ $type: 'Label', text: 'ok' }] }} registry={registry} />);
		expect(warnings()).toEqual([]);
	});

	it('checks the keys of array-of-object props (itemKeys), e.g. DataTable columns', () => {
		render(<DslRenderer node={{ $type: 'Table', columns: [{ field: 'a', widht: 100 }] }} registry={registry} />);
		const message = warnings().find(m => m.includes('unknown key "widht"'));
		expect(message).toContain('columns[0]');
		// An item key is located by its path under the node.
		expect(message?.endsWith(' (at columns[0])')).toBe(true);
	});

	it('leaves an expression-bound itemKeys prop alone', () => {
		render(<DslRenderer node={{ $type: 'Table', columns: '$sources.cols' }} registry={registry} />);
		expect(warnings()).toEqual([]);
	});

	it('says once per type that a hand-written entry (no knownKeys) is not checked, instead of staying silent or flooding', () => {
		render(<DslRenderer node={{ $type: 'Stack', items: [{ $type: 'Local', title: 'a' }, { $type: 'Local', title: 'b' }] }} registry={registry} />);
		const unchecked = warnings().filter(m => m.includes('[Local]') && m.includes('keys not checked'));
		expect(unchecked).toHaveLength(1);
	});

	it('does not warn for a node with no authored keys on a hand-written entry', () => {
		render(<DslRenderer node={{ $type: 'Local' }} registry={registry} />);
		expect(warnings()).toEqual([]);
	});

	it('is silent in production: no check runs and the node renders as before', () => {
		vi.stubEnv('NODE_ENV', 'production');
		render(<DslRenderer node={{ $type: 'Stack', children: [], txt: 'x', items: [{ $type: 'Label', text: 'shown' }] }} registry={registry} />);
		expect(screen.getByTestId('stack').textContent).toBe('shown');
		expect(warnings()).toEqual([]);
	});

	it('reports the same unknown key as the compile-time check', () => {
		const doc = { $type: 'Stack', children: [] };
		const compiled = findUnknownKeys(doc, registry).filter(d => d.code === 'unknown-key');
		render(<DslRenderer node={doc} registry={registry} />);
		expect(compiled).toHaveLength(1);
		expect(warnings().some(m => m.includes(compiled[0]!.message))).toBe(true);
	});
});
