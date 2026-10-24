import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
const appRoot = path.join(packagesDir, '__entries-remount-app');

afterAll(() => {
	fs.rmSync(appRoot, { recursive: true, force: true });
});

describe('generated bind-pattern entries', () => {
	// Regression: the generated render declared `function FieldTextWithContext()` INSIDE render, so every
	// re-render of the entry created a new component type and React unmounted and remounted the input
	// (focus lost, typed text and refs gone, textarea detached after each poll).
	it('keeps the same DOM node, focus and typed text when the parent re-renders', async () => {
		if (!fs.existsSync(generatorPath)) {
			throw new Error(`dsl-renderer is not built (${generatorPath} missing): run \`npm run build\` in packages/dsl-renderer first.`);
		}
		const { buildEntriesFile } = await import(/* @vite-ignore */ generatorPath);
		const content: string = buildEntriesFile(appRoot, [{ pkg: 'dsl-ui', absDir: path.join(packagesDir, 'dsl-ui/src/components/form') }]);
		const entriesPath = path.join(appRoot, 'src/generated/entries.tsx');
		fs.mkdirSync(path.dirname(entriesPath), { recursive: true });
		fs.writeFileSync(entriesPath, content);

		const { allEntries } = await import(/* @vite-ignore */ entriesPath);
		const { createRegistry, DslRenderer } = await import('../../dsl-renderer/dist/index.js');
		const registry = createRegistry(allEntries);

		function Host() {
			const [count, setCount] = React.useState(0);
			const [name, setName] = React.useState('');
			// New ctx object on every render, like a page whose source reloads or polls.
			const ctx = { formData: { name }, onChange: (_key: string, v: unknown) => setName(String(v)) };
			return (
				<div>
					<button type="button" onClick={() => setCount(count + 1)}>bump {count}</button>
					<DslRenderer node={{ $type: 'FieldText', bind: 'name', label: 'Name' }} registry={registry} ctx={ctx} />
				</div>
			);
		}

		render(<Host />);
		const input = screen.getByRole('textbox') as HTMLInputElement;
		const user = userEvent.setup();
		await user.click(input);
		await user.type(input, 'abc');
		expect(input.value).toBe('abc');

		// Parent re-render that does not move the focus (fireEvent does not click through the focus path).
		fireEvent.click(screen.getByRole('button', { name: /bump/ }));
		expect(screen.getByRole('button', { name: 'bump 1' })).toBeTruthy();

		const after = screen.getByRole('textbox') as HTMLInputElement;
		expect(after, 'the input was unmounted and re-created by the re-render').toBe(input);
		expect(after.isConnected).toBe(true);
		expect(after.value).toBe('abc');
		await user.type(after, 'd');
		expect(document.activeElement).toBe(after);
		expect(after.value).toBe('abcd');
		// Generating entries for the form components takes a while under a loaded machine.
	}, 300_000);
});
