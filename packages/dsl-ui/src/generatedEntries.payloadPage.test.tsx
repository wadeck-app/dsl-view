// The "edit, validate, then push" page of the queue module, with the REAL components through the REAL generated registry
// and a real GenericPageRunner: an editable monospace JSON area seeded from a source, a Validate button whose answer is
// shown inline, and a Push button that stays disabled until the CURRENT text has been validated. This is the page the
// consumer reference documents ("Editable payload"): keep the YAML in both places the same. Needs `npm run build` in
// dsl-renderer (workspace build, not the published copy in node_modules: see scripts/generate-known-keys.ts).
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
const appRoot = path.join(packagesDir, '__entries-payloadpage-app');

type Fetcher = (url: string, params?: Record<string, string>, body?: unknown, headers?: Record<string, string>) => Promise<unknown>;

let GenericPageRunner: typeof import('../../dsl-renderer/dist/index.js').GenericPageRunner;
let registry: ReturnType<typeof import('../../dsl-renderer/dist/index.js').createRegistry>;

beforeAll(async () => {
	if (!fs.existsSync(generatorPath)) {
		throw new Error(`dsl-renderer is not built (${generatorPath} missing): run \`npm run build\` in packages/dsl-renderer first.`);
	}
	const { buildEntriesFile } = await import(/* @vite-ignore */ generatorPath);
	const content: string = buildEntriesFile(appRoot, [
		{ pkg: 'dsl-ui', absDir: path.join(packagesDir, 'dsl-ui/src/components/form') },
		{ pkg: 'dsl-ui', absDir: path.join(packagesDir, 'dsl-ui/src/components/controls') },
		{ pkg: 'dsl-ui', absDir: path.join(packagesDir, 'dsl-ui/src/components/display') },
		{ pkg: 'dsl-ui', absDir: path.join(packagesDir, 'dsl-ui/src/components/layout') },
	]);
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

const PAGE = `
$vars:
  payload: $sources.event.exampleText
$sources:
  event: GET /api/events/ping
$actions:
  validatePayload:
    url: POST /api/events/ping/validate-payload
    resultKey: validation
    requestKey: validated
    successMessage: Validation answered
  pushTest:
    url: POST /api/events/ping/push-test
    successMessage: Test event pushed
$type: VerticalStack
items:
  - $type: FieldTextarea
    label: Example payload
    bind: payload
    mono: true
    rows: 8
  - $type: ActionButton
    label: Validate
    action: validatePayload
    body:
      payload: $vars.payload
  - $type: ActionButton
    label: Push test event
    action: pushTest
    icon: rocket
    iconOnly: true
    disabled: "!$validation.valid || $vars.payload != $validated.payload"
    disabledReason: Validate the payload first
    body:
      payload: $vars.payload
  - $type: Badge
    $if: "$validation.valid && $vars.payload == $validated.payload"
    label: Valid
    variant: success
  - $type: JsonViewer
    $if: "$validation.valid == false"
    row: $validation
    field: errors
`;

function makeFetcher(validate: (body: { payload: string }) => unknown) {
	return vi.fn<Fetcher>(async (url, _params, body) => {
		if (url.startsWith('GET /api/events/ping')) {
			return { exampleText: '{"a":1}' };
		}
		if (url.includes('validate-payload')) {
			return validate(body as { payload: string });
		}
		return { pushed: true };
	});
}

function renderPage(fetcher: Fetcher) {
	return render(
		<MemoryRouter>
			<GenericPageRunner yamlText={PAGE} registry={registry} fetcher={fetcher} brainRegistry={{}} />
		</MemoryRouter>
	);
}

const area = () => screen.getByRole('textbox', { name: 'Example payload' });
const push = () => screen.getByRole('button', { name: 'Push test event' });

describe('the editable payload page, with the real components', () => {
	it('shows the source text in a monospace area and keeps Push disabled until a validation succeeded', async () => {
		renderPage(makeFetcher(() => ({ valid: true })));

		await waitFor(() => expect(area()).toHaveValue('{"a":1}'));
		expect(area().className).toMatch(/font-mono/);
		expect(push()).toBeDisabled();
		expect(screen.getByRole('button', { name: 'Validate' })).toBeEnabled();
	});

	it('Validate sends the current text, shows the verdict inline and enables Push', async () => {
		const fetcher = makeFetcher(() => ({ valid: true }));
		renderPage(fetcher);
		await waitFor(() => expect(area()).toHaveValue('{"a":1}'));

		fireEvent.click(screen.getByRole('button', { name: 'Validate' }));

		await waitFor(() => expect(screen.getByText('Valid')).toBeInTheDocument());
		expect(push()).toBeEnabled();
		const call = fetcher.mock.calls.find(([url]) => url.includes('validate-payload'))!;
		expect(call[2]).toStrictEqual({ payload: '{"a":1}' });
	});

	it('shows the list of schema errors with their paths, and Push stays disabled', async () => {
		const errors = [{ path: '$.a', message: 'must be a string' }];
		renderPage(makeFetcher(() => ({ valid: false, errors })));
		await waitFor(() => expect(area()).toHaveValue('{"a":1}'));

		fireEvent.click(screen.getByRole('button', { name: 'Validate' }));

		await waitFor(() => expect(screen.getByText(/must be a string/)).toBeInTheDocument());
		expect(screen.getByText(/\$\.a/)).toBeInTheDocument();
		expect(screen.queryByText('Valid')).toBeNull();
		expect(push()).toBeDisabled();
	});

	it('editing the text after a successful validation disables Push again, validating the new text enables it', async () => {
		renderPage(makeFetcher(() => ({ valid: true })));
		await waitFor(() => expect(area()).toHaveValue('{"a":1}'));
		fireEvent.click(screen.getByRole('button', { name: 'Validate' }));
		await waitFor(() => expect(push()).toBeEnabled());

		fireEvent.change(area(), { target: { value: '{"a":2}' } });
		expect(area()).toHaveValue('{"a":2}');
		expect(push()).toBeDisabled();

		fireEvent.click(screen.getByRole('button', { name: 'Validate' }));
		await waitFor(() => expect(push()).toBeEnabled());
	});

	it('a valid answer shows the verdict without an empty error list, and an edit takes the stale verdict away', async () => {
		// Found in a real browser: the viewer printed `[]` under the Valid badge, and the badge stayed after an edit.
		renderPage(makeFetcher(() => ({ valid: true, errors: [] })));
		await waitFor(() => expect(area()).toHaveValue('{"a":1}'));
		fireEvent.click(screen.getByRole('button', { name: 'Validate' }));
		await waitFor(() => expect(screen.getByText('Valid')).toBeInTheDocument());
		expect(screen.queryByText('[]')).toBeNull();

		fireEvent.change(area(), { target: { value: '{"a":2}' } });
		expect(screen.queryByText('Valid')).toBeNull();
		expect(push()).toBeDisabled();
	});

	it('tells assistive technology why Push is disabled (a disabled button cannot take focus)', async () => {
		renderPage(makeFetcher(() => ({ valid: true })));
		await waitFor(() => expect(area()).toHaveValue('{"a":1}'));
		expect(push()).toBeDisabled();
		expect(push()).toHaveAccessibleDescription('Validate the payload first');
	});

	it('Push posts the edited text and reports success', async () => {
		const fetcher = makeFetcher(() => ({ valid: true }));
		renderPage(fetcher);
		await waitFor(() => expect(area()).toHaveValue('{"a":1}'));
		fireEvent.change(area(), { target: { value: '{"a":3}' } });
		fireEvent.click(screen.getByRole('button', { name: 'Validate' }));
		await waitFor(() => expect(push()).toBeEnabled());

		fireEvent.click(push());

		await waitFor(() => expect(fetcher.mock.calls.some(([url]) => url.includes('push-test'))).toBe(true));
		const call = fetcher.mock.calls.find(([url]) => url.includes('push-test'))!;
		expect(call[2]).toStrictEqual({ payload: '{"a":3}' });
		expect(await screen.findByText(/Test event pushed/)).toBeInTheDocument();
	});

	it('a validation that fails (server down) leaves Push disabled and says why through the notifier', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const down = Object.assign(new Error('Daemon is not running'), { status: 503 });
		renderPage(
			makeFetcher(() => {
				throw down;
			})
		);
		await waitFor(() => expect(area()).toHaveValue('{"a":1}'));

		fireEvent.click(screen.getByRole('button', { name: 'Validate' }));

		await waitFor(() => expect(push()).toBeDisabled());
		// A failure is always reported, whatever the success message says.
		expect((await screen.findByRole('alert')).textContent).toContain('Daemon is not running');
	});
});
