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

// Outside a Form and outside a table row, a bound field edits the page variables: it reads ctx.$vars[bind] and writes
// through ctx.$setVar(bind, value). Any enclosing scope (formData, row, onChange) keeps priority.
describe('a bound field outside a Form is bound to the page variables', () => {
	function renderOnPage(node: Record<string, unknown>, ctx: Record<string, unknown>) {
		return render(<DslRenderer node={{ ...node, bind: 'payload' }} registry={registry} ctx={ctx} />);
	}

	it('FieldTextarea shows $vars[bind] and writes the edit through $setVar', () => {
		const setVar = vi.fn();
		renderOnPage({ $type: 'FieldTextarea', label: 'Payload' }, { $vars: { payload: '{"a":1}' }, $setVar: setVar });
		const area = screen.getByRole('textbox', { name: 'Payload' });
		expect(area).toHaveValue('{"a":1}');

		fireEvent.change(area, { target: { value: '{"a":2}' } });

		expect(setVar).toHaveBeenCalledExactlyOnceWith('payload', '{"a":2}');
	});

	it('every family reads the variable: text, number, select and tags', () => {
		const vars = { payload: 'Ada' };
		const { unmount } = renderOnPage({ $type: 'FieldText', label: 'Name' }, { $vars: vars, $setVar: vi.fn() });
		expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Ada');
		unmount();

		const number = renderOnPage({ $type: 'FieldNumber', label: 'Count' }, { $vars: { payload: 7 }, $setVar: vi.fn() });
		expect(screen.getByRole('spinbutton', { name: 'Count' })).toHaveValue(7);
		number.unmount();

		const select = renderOnPage(
			{ $type: 'FieldSelect', label: 'Plan', options: [{ value: 'free', label: 'Free' }, { value: 'pro', label: 'Pro' }] },
			{ $vars: { payload: 'pro' }, $setVar: vi.fn() }
		);
		expect(screen.getByRole('combobox', { name: 'Plan' })).toHaveValue('pro');
		select.unmount();

		renderOnPage({ $type: 'FieldTags', label: 'Keywords' }, { $vars: { payload: ['a', 'b'] }, $setVar: vi.fn() });
		expect(screen.getByText('a')).toBeInTheDocument();
		expect(screen.getByText('b')).toBeInTheDocument();
	});

	it('an unset variable is an empty field, not the text "undefined"', () => {
		renderOnPage({ $type: 'FieldTextarea', label: 'Payload' }, { $vars: {}, $setVar: vi.fn() });
		expect(screen.getByRole('textbox', { name: 'Payload' })).toHaveValue('');
	});

	it('without $vars and $setVar (a bare DslRenderer) the field is empty and typing does not throw', () => {
		renderOnPage({ $type: 'FieldTextarea', label: 'Payload' }, {});
		const area = screen.getByRole('textbox', { name: 'Payload' });
		expect(area).toHaveValue('');
		expect(() => fireEvent.change(area, { target: { value: 'x' } })).not.toThrow();
	});

	it('ctx.formData wins over $vars: a field in a Form keeps the form data', () => {
		const setVar = vi.fn();
		const onChange = vi.fn();
		renderOnPage({ $type: 'FieldText', label: 'Name' }, { formData: { payload: 'from form' }, onChange, $vars: { payload: 'from vars' }, $setVar: setVar });
		const input = screen.getByRole('textbox', { name: 'Name' });
		expect(input).toHaveValue('from form');
		fireEvent.change(input, { target: { value: 'edited' } });
		expect(onChange).toHaveBeenCalledExactlyOnceWith('payload', 'edited');
		expect(setVar).not.toHaveBeenCalled();
	});

	it('a table row wins over $vars: a field in a row reads the row', () => {
		const setVar = vi.fn();
		renderOnPage({ $type: 'FieldText', label: 'Name' }, { row: { payload: 'from row' }, $vars: { payload: 'from vars' }, $setVar: setVar });
		expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('from row');
	});

	it('an enclosing onChange alone (no formData) keeps priority too: the field does not silently switch to $vars', () => {
		const setVar = vi.fn();
		const onChange = vi.fn();
		renderOnPage({ $type: 'FieldText', label: 'Name' }, { onChange, $vars: { payload: 'from vars' }, $setVar: setVar });
		const input = screen.getByRole('textbox', { name: 'Name' });
		expect(input).toHaveValue('');
		fireEvent.change(input, { target: { value: 'x' } });
		expect(onChange).toHaveBeenCalledExactlyOnceWith('payload', 'x');
		expect(setVar).not.toHaveBeenCalled();
	});
});

// A whole page: the runner provides $vars and $setVar, a `$vars` entry written as an expression is seeded from the
// source once, and typing is not lost to a reload of that source.
describe('a bound field on a page, seeded from a source', () => {
	it('shows the source text, keeps the typed text across a reload, and the field element is never replaced', async () => {
		const renderer = await import('../../dsl-renderer/dist/index.js');
		const { MemoryRouter } = await import('react-router-dom');
		const state = { exampleText: '{"a":1}' };
		const fetcher = vi.fn(async () => ({ exampleText: state.exampleText }));
		const yaml = `
$vars:
  payload: $sources.event.exampleText
$sources:
  event:
    url: GET /api/event
    poll: 1s
$type: FieldTextarea
label: Payload
bind: payload
mono: true
`;
		vi.useFakeTimers({ shouldAdvanceTime: true });
		try {
			render(
				<MemoryRouter>
					<renderer.GenericPageRunner yamlText={yaml} registry={registry} fetcher={fetcher} brainRegistry={{}} />
				</MemoryRouter>
			);
			const area = await screen.findByRole('textbox', { name: 'Payload' });
			await vi.waitFor(() => expect(area).toHaveValue('{"a":1}'));

			fireEvent.change(area, { target: { value: 'my edit' } });
			expect(area).toHaveValue('my edit');

			state.exampleText = 'changed on the server';
			const callsBefore = fetcher.mock.calls.length;
			await vi.advanceTimersByTimeAsync(1500);
			await vi.waitFor(() => expect(fetcher.mock.calls.length).toBeGreaterThan(callsBefore));

			expect(screen.getByRole('textbox', { name: 'Payload' })).toBe(area);
			expect(area).toHaveValue('my edit');
		} finally {
			vi.useRealTimers();
		}
	});
});

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
