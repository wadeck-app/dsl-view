import { fireEvent, render, screen } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const packagesDir = path.resolve(here, '../..');
// Workspace build of the renderer (see scripts/generate-known-keys.ts for why not node_modules).
const generatorPath = path.resolve(packagesDir, 'dsl-renderer/dist/build/entriesGenerator.js');
// The generated file imports ../../../dsl-ui/src relative to its own location, so it has to sit at
// <app>/src/generated inside packages/ to run against the real sources.
const appRoot = path.join(packagesDir, '__entries-bind-app');

// The built renderer, typed by what it exports (the test imports its dist, as generatedEntries.remount does).
type Renderer = typeof import('../../dsl-renderer/dist/index.js');
let registry: ReturnType<Renderer['createRegistry']>;
let DslRenderer: Renderer['DslRenderer'];

beforeAll(async () => {
	if (!fs.existsSync(generatorPath)) {
		throw new Error(`dsl-renderer is not built (${generatorPath} missing): run \`npm run build\` in packages/dsl-renderer first.`);
	}
	const { buildEntriesFile } = await import(/* @vite-ignore */ generatorPath);
	const content: string = buildEntriesFile(appRoot, [{ pkg: 'dsl-ui', absDir: path.join(packagesDir, 'dsl-ui/src/components/form') }]);
	const entriesPath = path.join(appRoot, 'src/generated/entries.tsx');
	fs.mkdirSync(path.dirname(entriesPath), { recursive: true });
	fs.writeFileSync(entriesPath, content);
	const { allEntries } = await import(/* @vite-ignore */ entriesPath);
	const renderer = await import('../../dsl-renderer/dist/index.js');
	registry = renderer.createRegistry(allEntries);
	DslRenderer = renderer.DslRenderer;
	// Generating entries for the form components takes a while under a loaded machine.
}, 300_000);

afterAll(() => {
	fs.rmSync(appRoot, { recursive: true, force: true });
});

/** Renders one bound node and returns the spy that receives every `ctx.onChange(key, value)`. */
function renderBound(node: Record<string, unknown>, formData: Record<string, unknown>) {
	const onChange = vi.fn();
	render(<DslRenderer node={{ ...node, bind: 'field' }} registry={registry} ctx={{ formData, onChange }} />);
	return onChange;
}

// Each bound family reads its value from ctx.formData[bind] and reports edits as ctx.onChange(bind, value).
describe('generated bind-pattern entries wire formData and onChange for every field family', () => {
	it('FieldText shows the bound value and reports the typed string', () => {
		const onChange = renderBound({ $type: 'FieldText', label: 'Name' }, { field: 'Ada' });
		const input = screen.getByRole('textbox', { name: 'Name' });
		expect(input).toHaveValue('Ada');
		fireEvent.change(input, { target: { value: 'Grace' } });
		expect(onChange).toHaveBeenCalledExactlyOnceWith('field', 'Grace');
	});

	it('FieldText with no value in formData is empty, not the text "undefined"', () => {
		renderBound({ $type: 'FieldText', label: 'Name' }, {});
		expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('');
	});

	it('FieldTextarea shows the bound value and reports the typed string', () => {
		const onChange = renderBound({ $type: 'FieldTextarea', label: 'Notes' }, { field: 'line' });
		const area = screen.getByRole('textbox', { name: 'Notes' });
		expect(area).toHaveValue('line');
		fireEvent.change(area, { target: { value: 'two\nlines' } });
		expect(onChange).toHaveBeenCalledExactlyOnceWith('field', 'two\nlines');
	});

	it('FieldNumber shows the bound number; with no value the input is empty, not "undefined"', () => {
		const onChange = renderBound({ $type: 'FieldNumber', label: 'Count' }, { field: 7 });
		const input = screen.getByRole('spinbutton', { name: 'Count' });
		expect(input).toHaveValue(7);
		fireEvent.change(input, { target: { value: '12' } });
		expect(onChange).toHaveBeenCalledExactlyOnceWith('field', '12');
	});

	it('FieldNumber with no value in formData renders an empty input', () => {
		renderBound({ $type: 'FieldNumber', label: 'Count' }, {});
		expect(screen.getByRole('spinbutton', { name: 'Count' })).toHaveValue(null);
	});

	it('FieldSelect selects the bound option and reports the chosen value', () => {
		const onChange = renderBound(
			{ $type: 'FieldSelect', label: 'Plan', options: [{ value: 'free', label: 'Free' }, { value: 'pro', label: 'Pro' }] },
			{ field: 'free' },
		);
		const select = screen.getByRole('combobox', { name: 'Plan' });
		expect(select).toHaveValue('free');
		fireEvent.change(select, { target: { value: 'pro' } });
		expect(onChange).toHaveBeenCalledExactlyOnceWith('field', 'pro');
	});

	it('FieldTags shows the bound list and reports the whole new array', () => {
		const onChange = renderBound({ $type: 'FieldTags', label: 'Keywords' }, { field: ['a', 'b'] });
		expect(screen.getByText('a')).toBeInTheDocument();
		fireEvent.change(screen.getByRole('textbox', { name: 'Keywords' }), { target: { value: 'c,' } });
		expect(onChange).toHaveBeenCalledExactlyOnceWith('field', ['a', 'b', 'c']);
	});

	it('FieldAutocomplete shows the label of the bound value and reports the chosen option value', () => {
		const onChange = renderBound(
			{ $type: 'FieldAutocomplete', label: 'Country', options: [{ value: 'fr', label: 'France' }, { value: 'de', label: 'Germany' }] },
			{ field: 'fr' },
		);
		const input = screen.getByRole('combobox', { name: 'Country' });
		expect(input).toHaveValue('France');
		fireEvent.focus(input);
		fireEvent.change(input, { target: { value: 'Ger' } });
		fireEvent.click(screen.getByRole('option', { name: 'Germany' }));
		expect(onChange).toHaveBeenCalledExactlyOnceWith('field', 'de');
	});
});
