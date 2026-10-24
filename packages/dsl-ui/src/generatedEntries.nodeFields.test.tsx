import { render, screen } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { afterAll, describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const packagesDir = path.resolve(here, '../..');
// Workspace build of the renderer (see scripts/generate-known-keys.ts for why not node_modules).
const generatorPath = path.resolve(packagesDir, 'dsl-renderer/dist/build/entriesGenerator.js');
// The generated file imports ../../../dsl-ui/src and ../../../dsl-renderer/src relative to its own location,
// so it has to sit at <app>/src/generated inside packages/ to run against the real sources.
const appRoot = path.join(packagesDir, '__entries-nodefields-app');

afterAll(() => {
	fs.rmSync(appRoot, { recursive: true, force: true });
});

describe('generated entries for array props whose items carry DSL nodes', () => {
	// Regression: Stepper `steps: { label, items: ReactNode }[]` reached React as raw YAML objects, so a step whose
	// `items` were DSL nodes crashed with "Objects are not valid as a React child" the moment the page really rendered.
	it('renders the DSL nodes of the active step through the registry', async () => {
		if (!fs.existsSync(generatorPath)) {
			throw new Error(`dsl-renderer is not built (${generatorPath} missing): run \`npm run build\` in packages/dsl-renderer first.`);
		}
		const { buildEntriesFile } = await import(/* @vite-ignore */ generatorPath);
		const content: string = buildEntriesFile(appRoot, [
			{ pkg: 'dsl-ui', absDir: path.join(packagesDir, 'dsl-ui/src/components/navigation') },
			{ pkg: 'dsl-ui', absDir: path.join(packagesDir, 'dsl-ui/src/components/display') },
		]);
		const entriesPath = path.join(appRoot, 'src/generated/entries.tsx');
		fs.mkdirSync(path.dirname(entriesPath), { recursive: true });
		fs.writeFileSync(entriesPath, content);

		const { allEntries } = await import(/* @vite-ignore */ entriesPath);
		const { createRegistry, DslRenderer } = await import('../../dsl-renderer/dist/index.js');
		const registry = createRegistry(allEntries);

		const node = {
			$type: 'Stepper',
			steps: [
				{ label: 'First step', items: [{ $type: 'Badge', label: 'inside the first step' }] },
				{ label: 'Second step', items: [{ $type: 'Badge', label: 'inside the second step' }] },
			],
		};
		render(<DslRenderer node={node} registry={registry} ctx={{}} />);

		expect(screen.getByText('inside the first step')).toBeTruthy();
		// Only the active step's content is mounted.
		expect(screen.queryByText('inside the second step')).toBeNull();
		expect(screen.getByText('Second step')).toBeTruthy();
		// Generating entries for a component folder takes a while under a loaded machine.
	}, 300_000);

	it('leaves a step without items alone (the component decides what an empty step shows)', async () => {
		const entriesPath = path.join(appRoot, 'src/generated/entries.tsx');
		const { allEntries } = await import(/* @vite-ignore */ entriesPath);
		const { createRegistry, DslRenderer } = await import('../../dsl-renderer/dist/index.js');
		const registry = createRegistry(allEntries);

		render(<DslRenderer node={{ $type: 'Stepper', steps: [{ label: 'Only step' }] }} registry={registry} ctx={{}} />);

		expect(screen.getByText('Only step')).toBeTruthy();
	}, 300_000);
});
