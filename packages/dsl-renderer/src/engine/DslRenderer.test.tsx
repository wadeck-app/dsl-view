import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createRegistry } from '../ComponentRegistry.js';
import type { ComponentRegistryEntry } from '../ComponentRegistry.js';
import { DslRenderer, resolveExpressionValue } from './DslRenderer.js';

const TextBox: ComponentRegistryEntry = {
	name: 'TextBox',
	category: 'atomic',
	tags: [],
	render: ({ node }) => <div data-testid="textbox">{node['text'] as string}</div>,
};

const NodeValidated: ComponentRegistryEntry = {
	name: 'NodeValidated',
	category: 'atomic',
	tags: [],
	nodeSchema: z.object({ $type: z.literal('NodeValidated'), required: z.string() }),
	render: () => <div data-testid="node-validated">ok</div>,
};

const CtxValidated: ComponentRegistryEntry = {
	name: 'CtxValidated',
	category: 'atomic',
	tags: [],
	ctxSchema: z.object({ userId: z.string() }),
	render: () => <div data-testid="ctx-validated">ok</div>,
};

const registry = createRegistry([TextBox, NodeValidated, CtxValidated]);

describe('DslRenderer', () => {
	const originalNodeEnv = process.env['NODE_ENV'];

	afterEach(() => {
		process.env['NODE_ENV'] = originalNodeEnv;
	});

	it('renders a known component', () => {
		render(<DslRenderer node={{ $type: 'TextBox', text: 'Hello' }} registry={registry} />);
		expect(screen.getByTestId('textbox')).toHaveTextContent('Hello');
	});

	it('renders error box for unknown component type', () => {
		render(<DslRenderer node={{ $type: 'Unknown' }} registry={registry} />);
		expect(screen.getByText(/Unknown component type/i)).toBeInTheDocument();
		expect(screen.getByText('Unknown')).toBeInTheDocument();
	});

	it('returns null when type is missing', () => {
		const { container } = render(<DslRenderer node={{}} registry={registry} />);
		expect(container.firstChild).toBeNull();
	});

	it('hides component when $if evaluates to false', () => {
		const ctx = { show: false };
		const { container } = render(
			<DslRenderer node={{ $type: 'TextBox', text: 'hidden', $if: '$show' }} registry={registry} ctx={ctx} />
		);
		expect(container.firstChild).toBeNull();
	});

	it('shows component when $if evaluates to true', () => {
		const ctx = { show: true };
		render(<DslRenderer node={{ $type: 'TextBox', text: 'visible', $if: '$show' }} registry={registry} ctx={ctx} />);
		expect(screen.getByTestId('textbox')).toHaveTextContent('visible');
	});

	describe('dev-only validation', () => {
		beforeEach(() => {
			process.env['NODE_ENV'] = 'development';
		});

		it('shows red error box when nodeSchema fails', () => {
			render(<DslRenderer node={{ $type: 'NodeValidated' }} registry={registry} />);
			expect(screen.getByText(/node schema error/i)).toBeInTheDocument();
		});

		it('renders normally when nodeSchema passes', () => {
			render(<DslRenderer node={{ $type: 'NodeValidated', required: 'present' }} registry={registry} />);
			expect(screen.getByTestId('node-validated')).toBeInTheDocument();
		});

		it('shows amber warning box when ctxSchema fails', () => {
			render(<DslRenderer node={{ $type: 'CtxValidated' }} registry={registry} ctx={{}} />);
			expect(screen.getByText(/ctx schema warning/i)).toBeInTheDocument();
		});

		it('renders normally when ctxSchema passes', () => {
			render(<DslRenderer node={{ $type: 'CtxValidated' }} registry={registry} ctx={{ userId: 'u1' }} />);
			expect(screen.getByTestId('ctx-validated')).toBeInTheDocument();
		});
	});

	describe('production: no schema validation', () => {
		beforeEach(() => {
			process.env['NODE_ENV'] = 'production';
		});

		it('renders without error box even when nodeSchema would fail', () => {
			render(<DslRenderer node={{ $type: 'NodeValidated' }} registry={registry} />);
			expect(screen.queryByText(/node schema error/i)).toBeNull();
			expect(screen.getByTestId('node-validated')).toBeInTheDocument();
		});
	});
});

describe('resolveExpressionValue', () => {
	const ctx = {
		'$vars': { name: 'Alice', nested: { key: 'deep-value' } },
		'$outputs': { nav: { selectedFile: 'file.ts' } },
		'$brains': { loadFile: { content: 'hello world' } },
		'books': { items: ['book1', 'book2'] },
	};

	describe('non-string passthrough', () => {
		it('returns number unchanged', () => {
			expect(resolveExpressionValue(42, ctx)).toBe(42);
		});

		it('returns null unchanged', () => {
			expect(resolveExpressionValue(null, ctx)).toBeNull();
		});

		it('returns object unchanged', () => {
			const obj = { a: 1 };
			expect(resolveExpressionValue(obj, ctx)).toBe(obj);
		});
	});

	describe('plain string (no $ prefix)', () => {
		it('returns the string as-is', () => {
			expect(resolveExpressionValue('hello', ctx)).toBe('hello');
		});
	});

	describe('$vars namespace', () => {
		it('resolves $vars.name from ctx', () => {
			expect(resolveExpressionValue('$vars.name', ctx)).toBe('Alice');
		});

		it('resolves $vars.nested.key deep path', () => {
			expect(resolveExpressionValue('$vars.nested.key', ctx)).toBe('deep-value');
		});

		it('returns undefined for missing $vars key', () => {
			expect(resolveExpressionValue('$vars.missing', ctx)).toBeUndefined();
		});
	});

	describe('$outputs namespace', () => {
		it('resolves $outputs.nav.selectedFile', () => {
			expect(resolveExpressionValue('$outputs.nav.selectedFile', ctx)).toBe('file.ts');
		});

		it('returns undefined when $outputs namespace key is absent', () => {
			expect(resolveExpressionValue('$outputs.missing.x', ctx)).toBeUndefined();
		});
	});

	describe('$brains namespace', () => {
		it('resolves $brains.loadFile.content', () => {
			expect(resolveExpressionValue('$brains.loadFile.content', ctx)).toBe('hello world');
		});
	});

	describe('$sources namespace', () => {
		it('resolves $sources.books to top-level ctx key', () => {
			expect(resolveExpressionValue('$sources.books', ctx)).toBe(ctx['books']);
		});

		it('resolves $sources.books.items to nested value', () => {
			expect(resolveExpressionValue('$sources.books.items', ctx)).toEqual(['book1', 'book2']);
		});

		it('returns undefined for missing $sources key', () => {
			expect(resolveExpressionValue('$sources.missing', ctx)).toBeUndefined();
		});
	});

	describe('$if integration with new namespaces', () => {
		it('renders component when $if $vars.visible is true', () => {
			const { container } = render(
				<DslRenderer
					node={{ $type: 'TextBox', $if: '$vars.visible' }}
					registry={registry}
					ctx={{ '$vars': { visible: true } }}
				/>
			);
			expect(container.firstChild).not.toBeNull();
		});

		it('returns null when $if $vars.visible is false', () => {
			const { container } = render(
				<DslRenderer
					node={{ $type: 'TextBox', $if: '$vars.visible' }}
					registry={registry}
					ctx={{ '$vars': { visible: false } }}
				/>
			);
			expect(container.firstChild).toBeNull();
		});
	});
});
