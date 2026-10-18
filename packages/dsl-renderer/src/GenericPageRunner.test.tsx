import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';

import type { ComponentRegistryEntry } from './ComponentRegistry.js';
import { createRegistry } from './ComponentRegistry.js';
import { COMPILED_DSL_FORMAT_VERSION } from './compiledDslArtifact.js';
import type { CompiledDslArtifact } from './compiledDslArtifact.js';
import { GenericPageRunner } from './GenericPageRunner.js';
import { renderChildren } from './engine/DslRenderer.js';
import { computeRegistryFingerprint } from './registryHash.js';

// ---------------------------------------------------------------------------
// Minimal test registry
// ---------------------------------------------------------------------------

const LabelEntry: ComponentRegistryEntry = {
	name: 'Label',
	category: 'atomic',
	tags: [],
	render: ({ node, ctx }) => {
		// Support expression resolution for `value` via ctx lookup
		// (DslRenderer doesn't auto-resolve node props - the component does it)
		const resolveExpr = (expr: unknown): unknown => {
			if (typeof expr !== 'string' || !expr.startsWith('$')) return expr;
			const path = expr.slice(1).split('.');
			const root = path[0];
			const rest = path.slice(1);
			let current: unknown;
			if (root === 'sources') {
				if (rest.length === 0) return undefined;
				current = ctx[rest[0]!];
				for (const key of rest.slice(1)) {
					if (current == null || typeof current !== 'object') return undefined;
					current = (current as Record<string, unknown>)[key];
				}
				return current;
			} else if (root === 'vars') {
				current = ctx['$vars'];
				for (const key of rest) {
					if (current == null || typeof current !== 'object') return undefined;
					current = (current as Record<string, unknown>)[key];
				}
				return current;
			} else if (root === 'brains') {
				current = ctx['$brains'];
				for (const key of rest) {
					if (current == null || typeof current !== 'object') return undefined;
					current = (current as Record<string, unknown>)[key];
				}
				return current;
			} else if (root === 'route') {
				current = ctx['$route'];
				for (const key of rest) {
					if (current == null || typeof current !== 'object') return undefined;
					current = (current as Record<string, unknown>)[key];
				}
				return current;
			}
			return ctx[root ?? ''];
		};

		const label = node['label'] as string | undefined;
		const rawValue = node['value'];
		const resolvedValue = resolveExpr(rawValue);

		return (
			<div
				data-testid="label"
				data-value={resolvedValue !== undefined ? String(resolvedValue) : undefined}
			>
				{label}
			</div>
		);
	},
};

const ButtonEntry: ComponentRegistryEntry = {
	name: 'Button',
	category: 'atomic',
	tags: [],
	render: ({ node, ctx }) => {
		const btnId = node['$id'] as string | undefined;
		const publishOutput = ctx['$publishOutput'] as
			| ((id: string, name: string, value: unknown) => void)
			| undefined;
		return (
			<button
				data-testid={`btn-${btnId}`}
				onClick={() => publishOutput?.(btnId ?? '', 'onClick', { $tick: Date.now() })}
			>
				{node['label'] as string}
			</button>
		);
	},
};

const VarDisplayEntry: ComponentRegistryEntry = {
	name: 'VarDisplay',
	category: 'atomic',
	tags: [],
	render: ({ node, ctx }) => {
		const varName = node['varName'] as string;
		const vars = ctx['$vars'] as Record<string, unknown> | undefined;
		const value = vars?.[varName];
		// Render objects as JSON so tests can assert on structured content without
		// relying on the "[object Object]" coercion artifact.
		const text = value === null || value === undefined
			? 'null'
			: typeof value === 'object'
				? JSON.stringify(value)
				: String(value);
		return <div data-testid="var-display">{text}</div>;
	},
};

// Container that renders child nodes from a `sections` array
const SectionsEntry: ComponentRegistryEntry = {
	name: 'Sections',
	category: 'disposition',
	tags: [],
	render: ({ node, registry, ctx }) => {
		const sections = (node['sections'] as unknown[]) ?? [];
		return <div data-testid="sections">{renderChildren(sections, registry, ctx)}</div>;
	},
};

const registry = createRegistry([LabelEntry, ButtonEntry, VarDisplayEntry, SectionsEntry]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderRunner(yamlText: string, fetcher = vi.fn().mockResolvedValue({})) {
	return render(
		<MemoryRouter>
			<GenericPageRunner
				yamlText={yamlText}
				registry={registry}
				fetcher={fetcher}
				brainRegistry={{}}
			/>
		</MemoryRouter>
	);
}

function renderRunnerWithRoute(yamlText: string, path: string, routePattern: string, fetcher = vi.fn().mockResolvedValue({})) {
	return render(
		<MemoryRouter initialEntries={[path]}>
			<Routes>
				<Route
					path={routePattern}
					element={
						<GenericPageRunner
							yamlText={yamlText}
							registry={registry}
							fetcher={fetcher}
							brainRegistry={{}}
						/>
					}
				/>
			</Routes>
		</MemoryRouter>
	);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GenericPageRunner integration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// -------------------------------------------------------------------------
	// Test 1: $sources populates ctx and value is accessible from component
	// -------------------------------------------------------------------------

	it('Test 1: $sources data is accessible in component via expression', async () => {
		const fetcher = vi.fn().mockResolvedValue([{ title: 'Book A' }]);

		renderRunner(
			`
$sources:
  books: GET /api/books/
$type: Label
label: loaded
value: $sources.books.0.title
`,
			fetcher
		);

		await waitFor(() => {
			const el = screen.getByTestId('label');
			expect(el).toHaveAttribute('data-value', 'Book A');
		});
	});

	// -------------------------------------------------------------------------
	// Test 2a: $vars initialise correctly
	// -------------------------------------------------------------------------

	it('Test 2a: $vars initial value is rendered by VarDisplay', async () => {
		renderRunner(`
$vars:
  greeting: hello
$type: VarDisplay
varName: greeting
`);

		await waitFor(() => {
			expect(screen.getByTestId('var-display')).toHaveTextContent('hello');
		});
	});

	// -------------------------------------------------------------------------
	// Test 2b: $brains.$ctx.setVar updates a var (static value, runs at init)
	// -------------------------------------------------------------------------

	it('Test 2b: $brains.$ctx.setVar with static value updates var immediately', async () => {
		renderRunner(`
$vars:
  count: 0
$brains:
  increment:
    $brain: $brains.$ctx.setVar
    varName: count
    value: 42
$type: VarDisplay
varName: count
`);

		// The brain runs on mount (first effect pass - no reactive deps = fires once)
		await waitFor(() => {
			expect(screen.getByTestId('var-display')).toHaveTextContent('42');
		});
	});

	// -------------------------------------------------------------------------
	// Test 3: $publishOutput is in ctx and observable via a reactive brain
	// -------------------------------------------------------------------------
	// This test explicitly verifies that ctx['$publishOutput'] is wired up and
	// actually stores output - not just that no error was thrown.
	// A VarDisplay driven by $outputs.myBtn.onClick confirms the full reactive path.

	it('Test 3: $publishOutput is in ctx and can be called via button click', async () => {
		renderRunner(`
$vars:
  clicked: false
$brains:
  onClickBrain:
    $brain: $brains.$ctx.setVar
    varName: clicked
    value: $outputs.myBtn.onClick
$type: Sections
sections:
  - $type: Button
    $id: myBtn
    label: Click me
  - $type: VarDisplay
    varName: clicked
`);

		// Initial state: brain does NOT fire at mount when $outputs.myBtn.onClick is
		// undefined (output not yet published) - clicked stays at its initial value 'false'.
		await waitFor(() => {
			expect(screen.getByTestId('var-display')).toHaveTextContent('false');
		});

		// Click - publishOutput fires, brain updates var with {$tick: N} object
		const btn = screen.getByTestId('btn-myBtn');
		fireEvent.click(btn);

		// After click: VarDisplay must show a non-null value - the $tick object
		// serialised as "[object Object]", proving $publishOutput is wired and the brain reacted
		await waitFor(() => {
			const display = screen.getByTestId('var-display');
			expect(display).not.toHaveTextContent('null');
			expect(display).not.toHaveTextContent('false');
		});
	});

	// -------------------------------------------------------------------------
	// Test 4: $brains.$http.get calls fetcher with correct URL
	// -------------------------------------------------------------------------

	it('Test 4: $brains.$http.get calls fetcher and exposes results via $brains ctx', async () => {
		const fetcher = vi.fn().mockResolvedValue({ items: [1, 2, 3] });

		renderRunner(
			`
$brains:
  load:
    $brain: $brains.$http.get
    url: GET /api/books/
    $outputs: [items]
$type: Label
label: done
`,
			fetcher
		);

		await waitFor(() => {
			expect(fetcher).toHaveBeenCalledWith('GET /api/books/', undefined, undefined, undefined);
		});
	});

	// -------------------------------------------------------------------------
	// Test 5a: $route params are exposed in ctx and resolvable via expression
	// -------------------------------------------------------------------------

	it('Test 5a: $route.itemId is exposed in ctx and readable in Label value', async () => {
		// LabelEntry's resolveExpr handles root = 'route' to read ctx['$route']
		renderRunnerWithRoute(
			`
$type: Label
label: route test
value: $route.itemId
`,
			'/items/item-42',
			'/items/:itemId'
		);

		await waitFor(() => {
			const el = screen.getByTestId('label');
			expect(el).toHaveAttribute('data-value', 'item-42');
		});
	});

	// -------------------------------------------------------------------------
	// Test 5: Full reactive loop - button click -> publishOutput -> brain -> setVar -> re-render
	// -------------------------------------------------------------------------

	it('Test 5: reactive loop - click triggers brain which updates var display', async () => {
		renderRunner(`
$vars:
  selectedItem: null
$brains:
  onSelect:
    $brain: $brains.$ctx.setVar
    varName: selectedItem
    value: $outputs.selectBtn.onClick
$type: Sections
sections:
  - $type: Button
    $id: selectBtn
    label: Select
  - $type: VarDisplay
    varName: selectedItem
`);

		// Step 1: initial render - VarDisplay shows "null"
		await waitFor(() => {
			expect(screen.getByTestId('var-display')).toHaveTextContent('null');
		});

		// Step 2: click the button - publishOutput fires
		const btn = screen.getByTestId('btn-selectBtn');
		fireEvent.click(btn);

		// Step 3: brain detects $outputs.selectBtn.onClick changed -> setVar -> re-render.
		// VarDisplay JSON.stringifies objects, so the $tick value appears as {"$tick":N}.
		// This rules out both "null" and "[object Object]" string corruption.
		await waitFor(() => {
			const display = screen.getByTestId('var-display');
			expect(display).not.toHaveTextContent('null');
			expect(display).not.toHaveTextContent('[object Object]');
			expect(display).toHaveTextContent('$tick');
		});
	});

	// -------------------------------------------------------------------------
	// Test: @registryLazy-style entry (React.lazy component) renders behind Suspense
	// -------------------------------------------------------------------------

	it('renders a React.lazy-wrapped entry and shows suspenseFallback while its chunk loads', async () => {
		let resolveImport!: () => void;
		const importPromise = new Promise<{ default: React.ComponentType }>(resolve => {
			resolveImport = () => resolve({ default: () => <div data-testid="lazy-loaded">loaded</div> });
		});
		const LazyComp = React.lazy(() => importPromise);

		const LazyEntry: ComponentRegistryEntry = {
			name: 'LazyComp',
			category: 'atomic',
			tags: [],
			render: () => <LazyComp />,
		};
		const lazyRegistry = createRegistry([LazyEntry]);

		render(
			<MemoryRouter>
				<GenericPageRunner
					yamlText={`$type: LazyComp`}
					registry={lazyRegistry}
					fetcher={vi.fn().mockResolvedValue({})}
					brainRegistry={{}}
					suspenseFallback={<div data-testid="loading-fallback">loading...</div>}
				/>
			</MemoryRouter>
		);

		expect(screen.getByTestId('loading-fallback')).toBeInTheDocument();

		resolveImport();

		await waitFor(() => {
			expect(screen.getByTestId('lazy-loaded')).toBeInTheDocument();
		});
	});

	it('warns when suspenseFallback is not passed and a lazy component is pending', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		let resolveImport!: () => void;
		const importPromise = new Promise<{ default: React.ComponentType }>(resolve => {
			resolveImport = () => resolve({ default: () => <div data-testid="lazy-loaded">loaded</div> });
		});
		const LazyComp = React.lazy(() => importPromise);
		const LazyEntry: ComponentRegistryEntry = {
			name: 'LazyComp',
			category: 'atomic',
			tags: [],
			render: () => <LazyComp />,
		};
		const lazyRegistry = createRegistry([LazyEntry]);

		render(
			<MemoryRouter>
				<GenericPageRunner
					yamlText={`$type: LazyComp`}
					registry={lazyRegistry}
					fetcher={vi.fn().mockResolvedValue({})}
					brainRegistry={{}}
				/>
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('suspenseFallback'));
		});

		resolveImport();
		await waitFor(() => expect(screen.getByTestId('lazy-loaded')).toBeInTheDocument());
		warnSpy.mockRestore();
	});

	it('does not warn when suspenseFallback is explicitly passed as null', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		let resolveImport!: () => void;
		const importPromise = new Promise<{ default: React.ComponentType }>(resolve => {
			resolveImport = () => resolve({ default: () => <div data-testid="lazy-loaded">loaded</div> });
		});
		const LazyComp = React.lazy(() => importPromise);
		const LazyEntry: ComponentRegistryEntry = {
			name: 'LazyComp',
			category: 'atomic',
			tags: [],
			render: () => <LazyComp />,
		};
		const lazyRegistry = createRegistry([LazyEntry]);

		render(
			<MemoryRouter>
				<GenericPageRunner
					yamlText={`$type: LazyComp`}
					registry={lazyRegistry}
					fetcher={vi.fn().mockResolvedValue({})}
					brainRegistry={{}}
					suspenseFallback={null}
				/>
			</MemoryRouter>
		);

		resolveImport();
		await waitFor(() => expect(screen.getByTestId('lazy-loaded')).toBeInTheDocument());
		expect(warnSpy).not.toHaveBeenCalled();
		warnSpy.mockRestore();
	});
});

describe('GenericPageRunner compiled artifact', () => {
	function makeArtifact(overrides: Partial<CompiledDslArtifact> = {}): CompiledDslArtifact {
		return {
			formatVersion: COMPILED_DSL_FORMAT_VERSION,
			registryFingerprint: computeRegistryFingerprint(registry),
			compiledAt: new Date().toISOString(),
			doc: { $type: 'Label', label: 'from-compiled' },
			diagnostics: [],
			...overrides,
		};
	}

	it('renders the same output from `compiled` as the equivalent `yamlText`', async () => {
		render(
			<MemoryRouter>
				<GenericPageRunner compiled={makeArtifact()} registry={registry} fetcher={vi.fn().mockResolvedValue({})} brainRegistry={{}} />
			</MemoryRouter>
		);
		await waitFor(() => {
			expect(screen.getByTestId('label')).toHaveTextContent('from-compiled');
		});
	});

	it('renders identically via `compiled` and via the equivalent `yamlText`, including $sources/$vars/$brains', async () => {
		const yamlText = `
$sources:
  books: GET /api/books/
$vars:
  greeting: hello
$brains:
  increment:
    $brain: $brains.$ctx.setVar
    varName: greeting
    value: $sources.books.0.title
$type: Sections
sections:
  - $type: Label
    label: loaded
    value: $sources.books.0.title
  - $type: VarDisplay
    varName: greeting
`;
		const fetcher = vi.fn().mockResolvedValue([{ title: 'Book A' }]);

		const yamlRender = render(
			<MemoryRouter>
				<GenericPageRunner yamlText={yamlText} registry={registry} fetcher={fetcher} brainRegistry={{}} />
			</MemoryRouter>
		);
		await waitFor(() => {
			expect(yamlRender.getByTestId('label')).toHaveAttribute('data-value', 'Book A');
			expect(yamlRender.getByTestId('var-display')).toHaveTextContent('Book A');
		});
		const yamlHtml = yamlRender.container.innerHTML;
		yamlRender.unmount();

		const { load: parseYaml } = await import('js-yaml');
		const doc = parseYaml(yamlText) as Record<string, unknown>;
		const compiledArtifact = makeArtifact({ doc });
		const fetcher2 = vi.fn().mockResolvedValue([{ title: 'Book A' }]);

		const compiledRender = render(
			<MemoryRouter>
				<GenericPageRunner compiled={compiledArtifact} registry={registry} fetcher={fetcher2} brainRegistry={{}} />
			</MemoryRouter>
		);
		await waitFor(() => {
			expect(compiledRender.getByTestId('label')).toHaveAttribute('data-value', 'Book A');
			expect(compiledRender.getByTestId('var-display')).toHaveTextContent('Book A');
		});

		expect(compiledRender.container.innerHTML).toBe(yamlHtml);
	});

	it('throws when neither yamlText nor compiled is provided', () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(() =>
			render(
				<MemoryRouter>
					<GenericPageRunner registry={registry} fetcher={vi.fn().mockResolvedValue({})} brainRegistry={{}} />
				</MemoryRouter>
			)
		).toThrow(/Either `yamlText` or `compiled` must be provided/);
		consoleErrorSpy.mockRestore();
	});

	it('throws on a formatVersion mismatch', () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(() =>
			render(
				<MemoryRouter>
					<GenericPageRunner
						compiled={makeArtifact({ formatVersion: COMPILED_DSL_FORMAT_VERSION + 1 })}
						registry={registry}
						fetcher={vi.fn().mockResolvedValue({})}
						brainRegistry={{}}
					/>
				</MemoryRouter>
			)
		).toThrow(/formatVersion/);
		consoleErrorSpy.mockRestore();
	});

	it('warns exactly once and still renders on a registryFingerprint mismatch', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		render(
			<MemoryRouter>
				<GenericPageRunner
					compiled={makeArtifact({ registryFingerprint: 'stale-fingerprint' })}
					registry={registry}
					fetcher={vi.fn().mockResolvedValue({})}
					brainRegistry={{}}
				/>
			</MemoryRouter>
		);
		await waitFor(() => {
			expect(screen.getByTestId('label')).toHaveTextContent('from-compiled');
		});
		expect(warnSpy).toHaveBeenCalledTimes(1);
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('different component registry'));
		warnSpy.mockRestore();
	});
});
