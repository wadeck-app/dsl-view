// Every frame of the generated showcase pages (components-*.yaml) must render with its starting $vars. A component that throws
// on a props combination the generator cannot see (SearchBar needs `urlParam` or `value` + `onChange`) blanks the whole page
// in the showcase module, so it is caught here, one test per component, before the page ships.
import { render } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { HeaderActionsProvider, HeaderActionsSlot } from './components/layout/HeaderActions.js';
import { RouterProvider } from './components/navigation/RouterProvider.js';
import { ToastProvider } from './components/overlay/Toast.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const packagesDir = path.resolve(here, '../..');
const generatorPath = path.resolve(packagesDir, 'dsl-renderer/dist/build/entriesGenerator.js');
// The generated entries file imports ../../../dsl-ui/src relative to its own location (see generatedEntries.bind.test.tsx).
const appRoot = path.join(packagesDir, '__entries-showcase-smoke-app');
const viewsDir = path.resolve(packagesDir, '../showcase/app-module-showcase/src/dsl-views');
const COMPONENT_GROUPS = ['controls', 'dev', 'display', 'form', 'layout', 'navigation', 'overlay', 'table'];

type Renderer = typeof import('../../dsl-renderer/dist/index.js');
let registry: ReturnType<Renderer['createRegistry']>;
let DslRenderer: Renderer['DslRenderer'];

interface Frame {
	file: string;
	component: string;
	vars: Record<string, unknown>;
	node: Record<string, unknown>;
}

// Read at collection time so each component gets its own test name.
const frames: Frame[] = fs
	.readdirSync(viewsDir)
	.filter(file => /^components-.*\.yaml$/.test(file))
	.flatMap(file => {
		const doc = yaml.load(fs.readFileSync(path.join(viewsDir, file), 'utf8')) as { $vars?: Record<string, unknown>; items?: Array<Record<string, unknown>> };
		return (doc.items ?? [])
			.filter(item => item['$type'] === 'Card')
			.map(item => {
				const header = item['header'] as Array<{ label?: string }>;
				return { file, component: String(header[0]?.label), vars: doc.$vars ?? {}, node: item };
			});
	});

beforeAll(async () => {
	if (!fs.existsSync(generatorPath)) {
		throw new Error(`dsl-renderer is not built (${generatorPath} missing): run \`npm run build\` in packages/dsl-renderer first.`);
	}
	const { buildEntriesFile } = await import(/* @vite-ignore */ generatorPath);
	const content: string = buildEntriesFile(appRoot, COMPONENT_GROUPS.map(group => ({ pkg: 'dsl-ui', absDir: path.join(packagesDir, 'dsl-ui/src/components', group) })));
	const entriesPath = path.join(appRoot, 'src/generated/entries.tsx');
	fs.mkdirSync(path.dirname(entriesPath), { recursive: true });
	fs.writeFileSync(entriesPath, content);
	const { allEntries } = await import(/* @vite-ignore */ entriesPath);
	const renderer = await import('../../dsl-renderer/dist/index.js');
	registry = renderer.createRegistry(allEntries);
	DslRenderer = renderer.DslRenderer;
}, 300_000);

afterAll(() => {
	fs.rmSync(appRoot, { recursive: true, force: true });
});

describe('the generated showcase frames render', () => {
	it('finds the generated pages', () => {
		expect(frames.length).toBeGreaterThan(50);
	});

	it.each(frames.map(frame => [`${frame.file} / ${frame.component}`, frame] as const))('%s', (_name, frame) => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		expect(() =>
			render(
				// The host (the app shell) provides the router, the URL params and the toasts; a frame may rely on all three.
				<MemoryRouter>
					<RouterProvider>
						<ToastProvider>
							<DslRenderer node={frame.node} registry={registry} ctx={{ $vars: frame.vars, $setVar: () => undefined }} />
						</ToastProvider>
					</RouterProvider>
				</MemoryRouter>
			)
		).not.toThrow();
	});
});

// The hand-written shell pages (shell-*.yaml) are whole pages: rendered in a host that has a header-actions slot, as the shell does.
const shellPages = fs
	.readdirSync(viewsDir)
	.filter(file => /^shell-.*\.yaml$/.test(file))
	.map(file => [file, yaml.load(fs.readFileSync(path.join(viewsDir, file), 'utf8')) as Record<string, unknown>] as const);

describe('the shell showcase pages render', () => {
	it.each(shellPages)('%s', (_file, node) => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const { container } = render(
			<MemoryRouter>
				<RouterProvider>
					<HeaderActionsProvider>
						<HeaderActionsSlot />
						<main data-testid="body">
							<DslRenderer node={node} registry={registry} ctx={{}} />
						</main>
					</HeaderActionsProvider>
				</RouterProvider>
			</MemoryRouter>
		);
		expect(container.querySelectorAll('h1').length).toBeLessThanOrEqual(1);
	});

	it('the header trail page puts its h1 and its two actions in the slot, none in the body', () => {
		const node = shellPages.find(([file]) => file === 'shell-header-trail.yaml')![1];
		const { getByTestId } = render(
			<MemoryRouter>
				<RouterProvider>
					<HeaderActionsProvider>
						<HeaderActionsSlot />
						<main data-testid="body">
							<DslRenderer node={node} registry={registry} ctx={{}} />
						</main>
					</HeaderActionsProvider>
				</RouterProvider>
			</MemoryRouter>
		);
		const slot = getByTestId('header-actions-slot');
		expect(slot.querySelector('h1')?.textContent).toBe('Header in the trail row');
		expect(slot.querySelectorAll('button')).toHaveLength(2);
		expect(getByTestId('body').querySelector('h1')).toBeNull();
	});
});
