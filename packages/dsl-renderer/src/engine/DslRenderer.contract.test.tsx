import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import React from 'react';
import { z } from 'zod';

import type { ComponentRegistryEntry } from '../ComponentRegistry.js';
import { createRegistry } from '../ComponentRegistry.js';
import { DslRenderer, resolveExpressionValue } from './DslRenderer.js';

// Prints the ctx keys it receives so exposure can be asserted.
const ProbeEntry: ComponentRegistryEntry = {
	name: 'Probe',
	category: 'atomic',
	tags: [],
	render: ({ ctx }) => <span data-testid="probe">{JSON.stringify({ a: ctx['a'], renamed: ctx['renamed'], b: ctx['b'] })}</span>,
};

const StrictEntry: ComponentRegistryEntry = {
	name: 'Strict',
	category: 'atomic',
	tags: [],
	nodeSchema: z.object({ $type: z.literal('Strict'), count: z.number(), nested: z.object({ deep: z.string() }).optional() }).passthrough(),
	render: () => <span data-testid="strict">rendered</span>,
};

const CtxStrictEntry: ComponentRegistryEntry = {
	name: 'CtxStrict',
	category: 'atomic',
	tags: [],
	ctxSchema: z.object({ needed: z.string() }).passthrough(),
	render: () => <span data-testid="ctx-strict">rendered</span>,
};

const registry = createRegistry([ProbeEntry, StrictEntry, CtxStrictEntry]);

describe('$context.expose', () => {
	it('exposes a key under its own name when the source is null, and under another name when mapped', () => {
		render(<DslRenderer node={{ $type: 'Probe', $context: { expose: { a: null, renamed: 'b' } } }} registry={registry} ctx={{ a: 1, b: 2 }} />);
		expect(JSON.parse(screen.getByTestId('probe').textContent!)).toEqual({ a: 1, renamed: 2, b: 2 });
	});

	it('shows an alert listing each missing source key ("target <- source") instead of rendering', () => {
		render(<DslRenderer node={{ $type: 'Probe', $context: { expose: { a: null, renamed: 'ghost' } } }} registry={registry} ctx={{ a: 1 }} />);
		const alert = screen.getByRole('alert');
		expect(alert.textContent).toContain('[Probe] $context.expose references missing ctx keys:');
		expect(alert.textContent).toContain('renamed <- ghost');
		expect(alert.textContent).not.toContain('a <- a');
		expect(screen.queryByTestId('probe')).toBeNull();
	});

	it('renders normally (no alert) when every source key exists, even if its value is undefined', () => {
		render(<DslRenderer node={{ $type: 'Probe', $context: { expose: { a: null } } }} registry={registry} ctx={{ a: undefined }} />);
		expect(screen.queryByRole('alert')).toBeNull();
		expect(screen.getByTestId('probe')).toBeInTheDocument();
	});
});

describe('dev-mode schema alerts', () => {
	it('lists a node schema issue with its dotted path, and "root" when the issue is at the root', () => {
		const { unmount } = render(<DslRenderer node={{ $type: 'Strict', count: 'x', nested: { deep: 3 } }} registry={registry} ctx={{}} />);
		const alert = screen.getByRole('alert');
		expect(alert.textContent).toContain('[Strict] node schema error:');
		expect(alert.textContent).toContain('count: ');
		expect(alert.textContent).toContain('nested.deep: ');
		unmount();

		// A wrong $type literal fails at the path "$type"; a non-object node (here an array under passthrough) fails at the root.
		const strictRoot = createRegistry([{ ...StrictEntry, nodeSchema: z.object({ $type: z.literal('Strict') }).refine(() => false, 'whole node rejected') }]);
		render(<DslRenderer node={{ $type: 'Strict' }} registry={strictRoot} ctx={{}} />);
		expect(screen.getByRole('alert').textContent).toContain('root: whole node rejected');
	});

	it('renders the component when the node matches its schema', () => {
		render(<DslRenderer node={{ $type: 'Strict', count: 2 }} registry={registry} ctx={{}} />);
		expect(screen.getByTestId('strict')).toBeInTheDocument();
		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('shows a ctx schema warning with the failing path', () => {
		render(<DslRenderer node={{ $type: 'CtxStrict' }} registry={registry} ctx={{ needed: 5 }} />);
		const alert = screen.getByRole('alert');
		expect(alert.textContent).toContain('[CtxStrict] ctx schema warning:');
		expect(alert.textContent).toContain('needed: ');
	});
});

describe('$if', () => {
	it('hides a node whose expression is falsy, shows it when truthy, and ignores a missing $if', () => {
		const ctx = { show: true, hide: 0 };
		const { rerender } = render(<DslRenderer node={{ $type: 'Probe', $if: '$ctx.hide' }} registry={registry} ctx={ctx} />);
		expect(screen.queryByTestId('probe')).toBeNull();
		rerender(<DslRenderer node={{ $type: 'Probe', $if: '$ctx.show' }} registry={registry} ctx={ctx} />);
		expect(screen.getByTestId('probe')).toBeInTheDocument();
		rerender(<DslRenderer node={{ $type: 'Probe' }} registry={registry} ctx={ctx} />);
		expect(screen.getByTestId('probe')).toBeInTheDocument();
	});

	// "falsy" in the docs means JavaScript falsiness: an empty array or object still shows the node.
	it.each([false, 0, '', null, undefined])('hides the node when $if resolves to %j', value => {
		render(<DslRenderer node={{ $type: 'Probe', $if: '$ctx.flag' }} registry={registry} ctx={{ flag: value }} />);
		expect(screen.queryByTestId('probe')).toBeNull();
	});

	it.each([true, 1, 'text', [], {}])('shows the node when $if resolves to %j', value => {
		render(<DslRenderer node={{ $type: 'Probe', $if: '$ctx.flag' }} registry={registry} ctx={{ flag: value }} />);
		expect(screen.getByTestId('probe')).toBeInTheDocument();
	});

	it('hides the node when the $if path does not exist at all', () => {
		render(<DslRenderer node={{ $type: 'Probe', $if: '$vars.nothing.here' }} registry={registry} ctx={{ $vars: {} }} />);
		expect(screen.queryByTestId('probe')).toBeNull();
	});

	it('hides an unknown component type behind nothing: an unknown type is reported even if $if would hide it', () => {
		render(<DslRenderer node={{ $type: 'Ghost', $if: '$ctx.hide' }} registry={registry} ctx={{ hide: false }} />);
		expect(screen.getByRole('alert').textContent).toContain('Unknown component type: Ghost');
	});
});

describe('resolveExpressionValue path walking', () => {
	const ctx = {
		$vars: { user: { name: 'Ada', nothing: null, tags: ['x'] }, text: 'abc' },
		$outputs: { picker: { id: 'p1' } },
		$brains: { save: { $pending: false } },
		$route: { id: 'r1' },
		$props: { label: 'L' },
		books: { items: [{ title: 'T' }], none: null, str: 'abc' },
		plain: { x: 1 },
	};

	it('resolves each root', () => {
		expect(resolveExpressionValue('$vars.user.name', ctx)).toBe('Ada');
		expect(resolveExpressionValue('$outputs.picker.id', ctx)).toBe('p1');
		expect(resolveExpressionValue('$brains.save.$pending', ctx)).toBe(false);
		expect(resolveExpressionValue('$route.id', ctx)).toBe('r1');
		expect(resolveExpressionValue('$props.label', ctx)).toBe('L');
		expect(resolveExpressionValue('$ctx.plain.x', ctx)).toBe(1);
		expect(resolveExpressionValue('$sources.books.items', ctx)).toEqual([{ title: 'T' }]);
		expect(resolveExpressionValue('$plain.x', ctx)).toBe(1);
	});

	it('returns undefined (never throws) when the path runs into null or a primitive', () => {
		expect(resolveExpressionValue('$vars.user.nothing.deeper', ctx)).toBeUndefined();
		expect(resolveExpressionValue('$vars.text.length', ctx)).toBeUndefined();
		expect(resolveExpressionValue('$sources.books.none.deeper', ctx)).toBeUndefined();
		expect(resolveExpressionValue('$sources.books.str.length', ctx)).toBeUndefined();
		expect(resolveExpressionValue('$vars.missing.deeper', ctx)).toBeUndefined();
	});

	it('returns undefined for a bare $sources, and passes non-strings and non-$ strings through', () => {
		expect(resolveExpressionValue('$sources', ctx)).toBeUndefined();
		expect(resolveExpressionValue('plain text', ctx)).toBe('plain text');
		expect(resolveExpressionValue(5, ctx)).toBe(5);
		const list = [1];
		expect(resolveExpressionValue(list, ctx)).toBe(list);
	});
});
