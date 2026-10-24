// The page-level ActionButton through the REAL generated registry and a real GenericPageRunner: the generator wires
// `onAction` / `actionPending` from the page ctx (@ctxDefault), so a page needs no wiring. Needs `npm run build` in
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
const appRoot = path.join(packagesDir, '__entries-actionbutton-app');

type Fetcher = (url: string, params?: Record<string, string>, body?: unknown, headers?: Record<string, string>) => Promise<unknown>;
type Deferred = { promise: Promise<unknown>; resolve: (v?: unknown) => void; reject: (e: Error) => void };

function deferred(): Deferred {
	let resolve!: (v?: unknown) => void;
	let reject!: (e: Error) => void;
	const promise = new Promise<unknown>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

let GenericPageRunner: typeof import('../../dsl-renderer/dist/index.js').GenericPageRunner;
let registry: ReturnType<typeof import('../../dsl-renderer/dist/index.js').createRegistry>;

beforeAll(async () => {
	if (!fs.existsSync(generatorPath)) {
		throw new Error(`dsl-renderer is not built (${generatorPath} missing): run \`npm run build\` in packages/dsl-renderer first.`);
	}
	const { buildEntriesFile } = await import(/* @vite-ignore */ generatorPath);
	const content: string = buildEntriesFile(appRoot, [
		{ pkg: 'dsl-ui', absDir: path.join(packagesDir, 'dsl-ui/src/components/controls') },
		// Badge shows what an action stored under its `resultKey`; VerticalStack lays the two out.
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
	// Generating entries for a component folder takes a while under a loaded machine.
}, 300_000);

afterAll(() => {
	fs.rmSync(appRoot, { recursive: true, force: true });
});

afterEach(() => {
	vi.restoreAllMocks();
});

function renderPage(yaml: string, fetcher: Fetcher) {
	return render(
		<MemoryRouter>
			<GenericPageRunner yamlText={yaml} registry={registry} fetcher={fetcher} brainRegistry={{}} />
		</MemoryRouter>
	);
}

const PAGE = (actionExtra = '', buttonExtra = '') => `
$vars:
  name: ping
$actions:
  pushTest:
    url: "POST /api/events/{name}/push-test"
${actionExtra}
$type: ActionButton
action: pushTest
label: Push test event
params:
  name: $vars.name
${buttonExtra}
`;

describe('ActionButton in a page (generated registry, real GenericPageRunner)', () => {
	it('sends exactly one request with the url filled from params, and reports success', async () => {
		const fetcher = vi.fn<Fetcher>().mockResolvedValue({});
		renderPage(PAGE('    successMessage: "Test event pushed"'), fetcher);

		fireEvent.click(screen.getByRole('button', { name: 'Push test event' }));

		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
		expect(fetcher.mock.calls[0]?.[0]).toBe('POST /api/events/ping/push-test');
		expect((await screen.findByRole('status')).textContent).toContain('Test event pushed');
	});

	it('percent-encodes a param value that comes from a source', async () => {
		const fetcher = vi.fn<Fetcher>(async url => (url.startsWith('GET') ? { name: 'a b/c' } : {}));
		renderPage(
			`
$sources:
  event:
    url: GET /api/event
$actions:
  pushTest:
    url: "POST /api/events/{name}/push-test"
$type: ActionButton
action: pushTest
label: Push
params:
  name: $sources.event.name
`,
			fetcher
		);

		await waitFor(() => expect(fetcher).toHaveBeenCalledWith('GET /api/event', undefined, undefined, undefined));
		await waitFor(() => expect(screen.getByRole('button', { name: 'Push' })).toBeEnabled());
		fireEvent.click(screen.getByRole('button', { name: 'Push' }));

		await waitFor(() => expect(fetcher).toHaveBeenCalledWith('POST /api/events/a%20b%2Fc/push-test', expect.anything(), undefined, undefined));
	});

	it('is busy while the request runs, ignores a second click, and is usable again afterwards', async () => {
		const pending = deferred();
		const fetcher = vi.fn<Fetcher>().mockReturnValue(pending.promise);
		renderPage(PAGE(), fetcher);
		const button = screen.getByRole('button', { name: 'Push test event' });

		fireEvent.click(button);
		await waitFor(() => expect(button).toBeDisabled());
		expect(button).toHaveAttribute('aria-busy', 'true');
		fireEvent.click(button);
		expect(fetcher).toHaveBeenCalledTimes(1);

		pending.resolve({});
		await waitFor(() => expect(button).toBeEnabled());
		expect(button).not.toHaveAttribute('aria-busy');
	});

	it('asks for the action confirm: declining sends nothing, accepting sends the request', async () => {
		const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
		const fetcher = vi.fn<Fetcher>().mockResolvedValue({});
		renderPage(PAGE('    confirm: "Push it?"'), fetcher);
		const button = screen.getByRole('button', { name: 'Push test event' });

		fireEvent.click(button);
		await waitFor(() => expect(confirm).toHaveBeenCalledWith('Push it?'));
		await waitFor(() => expect(button).toBeEnabled());
		expect(fetcher).not.toHaveBeenCalled();

		fireEvent.click(button);
		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
	});

	it('reports a failure with errorPrefix and the status, then lets the user try again', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const failure = Object.assign(new Error('Daemon is not running'), { status: 503 });
		const fetcher = vi.fn<Fetcher>().mockRejectedValueOnce(failure).mockResolvedValue({});
		renderPage(PAGE('    errorPrefix: "Could not push"'), fetcher);
		const button = screen.getByRole('button', { name: 'Push test event' });

		fireEvent.click(button);
		const alert = await screen.findByRole('alert');
		expect(alert.textContent).toContain('Could not push: Daemon is not running');
		expect(alert.textContent).toContain('HTTP 503');
		await waitFor(() => expect(button).toBeEnabled());

		fireEvent.click(button);
		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
	});

	it('sends nothing and names the placeholder when a param is missing', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const fetcher = vi.fn<Fetcher>().mockResolvedValue({});
		renderPage(PAGE().replace('name: $vars.name', 'other: 1'), fetcher);

		fireEvent.click(screen.getByRole('button', { name: 'Push test event' }));

		const alert = await screen.findByRole('alert');
		expect(alert.textContent).toContain('URL placeholder {name} has no value');
		expect(fetcher).not.toHaveBeenCalled();
	});

	it('reports an unknown action with the actions the page has, and sends nothing', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const fetcher = vi.fn<Fetcher>().mockResolvedValue({});
		renderPage(PAGE().replace('action: pushTest', 'action: pushTset'), fetcher);

		fireEvent.click(screen.getByRole('button', { name: 'Push test event' }));

		const alert = await screen.findByRole('alert');
		expect(alert.textContent).toContain('No action spec found for "pushTset"');
		expect(alert.textContent).toContain('available: pushTest');
		expect(fetcher).not.toHaveBeenCalled();
	});

	it('an action with neither url nor resultKey warns in the console instead of silently doing nothing', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const fetcher = vi.fn<Fetcher>().mockResolvedValue({});
		renderPage(
			`
$actions:
  empty:
    confirm: "Sure?"
$type: ActionButton
action: empty
label: Nothing
`,
			fetcher
		);

		fireEvent.click(screen.getByRole('button', { name: 'Nothing' }));

		await waitFor(() =>
			expect(warn).toHaveBeenCalledWith(
				'[GenericPageRunner] $actions.empty has neither a url nor a resultKey: running it does nothing. Fix $actions.empty'
			)
		);
		expect(fetcher).not.toHaveBeenCalled();
		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('sends the body built from page state as the request body', async () => {
		const fetcher = vi.fn<Fetcher>().mockResolvedValue({});
		renderPage(
			`
$vars:
  payload: '{"a":1}'
$actions:
  validate:
    url: "POST /api/events/x/validate-payload"
$type: ActionButton
action: validate
label: Validate
body:
  payload: $vars.payload
`,
			fetcher
		);

		fireEvent.click(screen.getByRole('button', { name: 'Validate' }));

		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
		expect(fetcher.mock.calls[0]).toStrictEqual(['POST /api/events/x/validate-payload', { id: '' }, { payload: '{"a":1}' }, undefined]);
	});

	const RESULT_PAGE = `
$actions:
  validate:
    url: "POST /api/events/x/validate-payload"
    resultKey: validation
$type: VerticalStack
items:
  - $type: ActionButton
    action: validate
    label: Validate
  - $type: Badge
    label: $validation.summary
`;

	it('stores the response under resultKey, readable as $<resultKey> by the rest of the page', async () => {
		const fetcher = vi.fn<Fetcher>().mockResolvedValue({ summary: 'valid: no schema errors' });
		renderPage(RESULT_PAGE, fetcher);

		fireEvent.click(screen.getByRole('button', { name: 'Validate' }));

		expect(await screen.findByText('valid: no schema errors')).toBeTruthy();
	});

	it('replaces a previous result by { error, status } when the call fails, and still notifies', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const failure = Object.assign(new Error('Payload is not valid JSON'), { status: 422 });
		const fetcher = vi.fn<Fetcher>().mockResolvedValueOnce({ summary: 'valid: no schema errors' }).mockRejectedValueOnce(failure);
		renderPage(RESULT_PAGE.replace('$validation.summary', '$validation.error'), fetcher);

		fireEvent.click(screen.getByRole('button', { name: 'Validate' }));
		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
		await waitFor(() => expect(screen.getByRole('button', { name: 'Validate' })).toBeEnabled());
		fireEvent.click(screen.getByRole('button', { name: 'Validate' }));

		expect((await screen.findByRole('alert')).textContent).toContain('Payload is not valid JSON');
		// The same message is also readable by the page (the Badge) and the old `summary` result is gone.
		expect(screen.getByText('Payload is not valid JSON')).toBeTruthy();
		expect(screen.queryByText('valid: no schema errors')).toBeNull();
	});

	it('an icon-only button keeps the label as its accessible name', () => {
		renderPage(PAGE('', 'icon: rocket\niconOnly: true'), vi.fn<Fetcher>().mockResolvedValue({}));
		const button = screen.getByRole('button', { name: 'Push test event' });
		expect(button.textContent).toBe('');
		expect(button.querySelector('svg')).not.toBeNull();
	});

	it('a disabled button stays disabled and sends nothing', () => {
		const fetcher = vi.fn<Fetcher>().mockResolvedValue({});
		renderPage(PAGE('', 'disabled: true'), fetcher);
		const button = screen.getByRole('button', { name: 'Push test event' });
		expect(button).toBeDisabled();
		fireEvent.click(button);
		expect(fetcher).not.toHaveBeenCalled();
	});
});
