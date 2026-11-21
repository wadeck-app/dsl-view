// A YAML Badge with `onRemove: $action`, through the REAL generated registry and a real GenericPageRunner: the cross must
// run the page action. Needs `npm run build` in dsl-renderer (workspace build, not the published copy).
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
const appRoot = path.join(packagesDir, '__entries-badge-app');

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
		['display', 'layout'].map(dir => ({ pkg: 'dsl-ui', absDir: path.join(packagesDir, 'dsl-ui/src/components', dir) }))
	);
	const entriesPath = path.join(appRoot, 'src/generated/entries.tsx');
	fs.mkdirSync(path.dirname(entriesPath), { recursive: true });
	fs.writeFileSync(entriesPath, content);
	const { allEntries } = await import(/* @vite-ignore */ entriesPath);
	const renderer = await import('../../dsl-renderer/dist/index.js');
	GenericPageRunner = renderer.GenericPageRunner;
	registry = renderer.createRegistry(allEntries);
}, 300_000);

afterAll(() => {
	fs.rmSync(appRoot, { recursive: true, force: true });
});

afterEach(() => {
	vi.restoreAllMocks();
});

const PAGE = `
$actions:
  leaveSudo:
    url: POST /api/sudo/leave
$type: VerticalStack
items:
  - $type: Badge
    label: Sudo
    variant: danger
    tone: subtle
    removeLabel: Leave sudo mode
    onRemove: $leaveSudo
`;

describe('Badge onRemove from YAML', () => {
	it('shows the cross and runs the page action when it is clicked', async () => {
		const fetcher: Fetcher = vi.fn(async () => ({}));
		render(
			<MemoryRouter>
				<GenericPageRunner yamlText={PAGE} registry={registry} fetcher={fetcher} brainRegistry={{}} />
			</MemoryRouter>
		);
		fireEvent.click(await screen.findByRole('button', { name: 'Leave sudo mode' }));
		await waitFor(() => expect(fetcher).toHaveBeenCalledWith('POST /api/sudo/leave', undefined, undefined, undefined));
	});
});
