// A YAML DialogForm opened by a url-less action, through the REAL generated registry and a real GenericPageRunner: it must
// close on Cancel and after Save when the page wires `onClose: $closeX` to an action with `clear: true` (project-owner:
// "opens but can never close"). Needs `npm run build` in dsl-renderer (workspace build, not the published copy).
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const packagesDir = path.resolve(here, '../..');
const generatorPath = path.resolve(packagesDir, 'dsl-renderer/dist/build/entriesGenerator.js');
// The generated file imports ../../../dsl-ui/src relative to its own location, so it sits at <app>/src/generated.
const appRoot = path.join(packagesDir, '__entries-dialogform-app');

type Fetcher = (url: string, params?: Record<string, string>, body?: unknown, headers?: Record<string, string>) => Promise<unknown>;

let GenericPageRunner: typeof import('../../dsl-renderer/dist/index.js').GenericPageRunner;
let registry: ReturnType<typeof import('../../dsl-renderer/dist/index.js').createRegistry>;

beforeAll(async () => {
	if (!fs.existsSync(generatorPath)) {
		throw new Error(`dsl-renderer is not built (${generatorPath} missing): run \`npm run build\` in packages/dsl-renderer first.`);
	}
	const { buildEntriesFile } = await import(/* @vite-ignore */ generatorPath);
	const content: string = buildEntriesFile(
		appRoot,
		['controls', 'form', 'layout', 'overlay'].map(dir => ({ pkg: 'dsl-ui', absDir: path.join(packagesDir, 'dsl-ui/src/components', dir) }))
	);
	const entriesPath = path.join(appRoot, 'src/generated/entries.tsx');
	fs.mkdirSync(path.dirname(entriesPath), { recursive: true });
	fs.writeFileSync(entriesPath, content);
	const { allEntries } = await import(/* @vite-ignore */ entriesPath);
	const renderer = await import('../../dsl-renderer/dist/index.js');
	GenericPageRunner = renderer.GenericPageRunner;
	registry = renderer.createRegistry(allEntries);
	// Generating entries for four component folders takes a while under a loaded machine.
}, 300_000);

afterAll(() => {
	fs.rmSync(appRoot, { recursive: true, force: true });
});

afterEach(() => {
	vi.restoreAllMocks();
});

const PAGE = (onClose: string) => `
$actions:
  openItem:
    resultKey: itemDialog
  closeItem:
    resultKey: itemDialog
    clear: true
  saveItem:
    url: POST /api/items
$type: VerticalStack
items:
  - $type: ActionButton
    action: openItem
    label: Open it
  - $type: DialogForm
    title: Item
    visible: $itemDialog
    initialData: $itemDialog
    onSubmit: $saveItem
${onClose}
    fields:
      - $type: FieldText
        label: Name
        bind: name
`;

function renderPage(yaml: string, fetcher: Fetcher) {
	return render(
		<MemoryRouter>
			<GenericPageRunner yamlText={yaml} registry={registry} fetcher={fetcher} brainRegistry={{}} />
		</MemoryRouter>
	);
}

describe('DialogForm opened by a url-less action', () => {
	it('opens on the action and closes on Cancel when onClose is wired to a clear action', async () => {
		renderPage(PAGE('    onClose: $closeItem'), vi.fn(async () => ({})));
		expect(screen.queryByRole('dialog')).toBeNull();
		fireEvent.click(screen.getByRole('button', { name: 'Open it' }));
		await screen.findByRole('dialog', { name: 'Item' });
		fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	});

	it('closes after a successful Save, and can be opened again', async () => {
		const fetcher = vi.fn(async () => ({}));
		renderPage(PAGE('    onClose: $closeItem'), fetcher);
		fireEvent.click(screen.getByRole('button', { name: 'Open it' }));
		fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'Ada' } });
		fireEvent.click(screen.getByRole('button', { name: 'Save' }));
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
		expect(fetcher).toHaveBeenCalledWith('POST /api/items', undefined, { name: 'Ada' }, undefined);
		fireEvent.click(screen.getByRole('button', { name: 'Open it' }));
		await screen.findByRole('dialog', { name: 'Item' });
	});

	it('stays open and says how to wire it when the page has no onClose', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		renderPage(PAGE(''), vi.fn(async () => ({})));
		fireEvent.click(screen.getByRole('button', { name: 'Open it' }));
		await screen.findByRole('dialog', { name: 'Item' });
		fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
		expect(screen.getByRole('dialog', { name: 'Item' })).toBeInTheDocument();
		expect(warn.mock.calls.map(c => String(c[0])).some(m => m.includes('[DialogForm] "Item"') && m.includes('clear: true'))).toBe(true);
	});
});
