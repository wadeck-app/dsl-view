import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

import type { ComponentRegistryEntry } from './ComponentRegistry.js';
import { createRegistry } from './ComponentRegistry.js';
import { GenericPageRunner } from './GenericPageRunner.js';

// violations-suppress-start: react/no-raw-button test stand-in for the generated Form entry; dsl-renderer cannot import dsl-ui's Button
// Submits like a Form: calls the named `$ctx.<handler>` with the form data as extraBody.
const SubmitEntry: ComponentRegistryEntry = {
	name: 'Submit',
	category: 'atomic',
	tags: [],
	render: ({ node, ctx }) => {
		const handler = ctx[node['handler'] as string] as (body?: Record<string, unknown>) => Promise<unknown>;
		const data = node['data'] as Record<string, unknown>;
		return <button onClick={() => void handler(data).catch(() => undefined)}>submit</button>;
	},
};
// violations-suppress-end

const registry = createRegistry([SubmitEntry]);

const PAGE = (actionExtra: string, data: string) => `
$actions:
  rename:
    url: "PATCH /api/files/{id}?project={project}"
${actionExtra}
$type: Submit
handler: rename
data: ${data}
`;

function renderPage(yaml: string) {
	const fetcher = vi.fn().mockResolvedValue({});
	render(
		<MemoryRouter>
			<GenericPageRunner yamlText={yaml} registry={registry} fetcher={fetcher} brainRegistry={{}} />
		</MemoryRouter>
	);
	return { fetcher };
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('named handler ($ctx.<name>) URL placeholders', () => {
	it('default mode substitutes values as given, so an already-encoded value is NOT encoded twice', async () => {
		const { fetcher } = renderPage(PAGE('', '{ id: "a%2Fb", project: "%2Fp%2Fx" }'));
		fireEvent.click(screen.getByText('submit'));
		await waitFor(() => expect(fetcher).toHaveBeenCalled());
		expect(fetcher.mock.calls[0]![0]).toBe('PATCH /api/files/a%2Fb?project=%2Fp%2Fx');
	});

	it('default mode keeps sending an empty value but warns once, naming the action and the placeholder', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const { fetcher } = renderPage(PAGE('', '{ id: "7", project: "" }'));
		fireEvent.click(screen.getByText('submit'));
		await waitFor(() => expect(fetcher).toHaveBeenCalled());
		expect(fetcher.mock.calls[0]![0]).toBe('PATCH /api/files/7?project=');
		fireEvent.click(screen.getByText('submit'));
		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
		const messages = warn.mock.calls.map(call => String(call[0])).filter(m => m.includes('$actions.rename') && m.includes('{project}'));
		expect(messages).toHaveLength(1);
		expect(messages[0]).toContain('strictParams: true');
	});

	it('strictParams percent-encodes each substituted value', async () => {
		const { fetcher } = renderPage(PAGE('    strictParams: true', '{ id: "a/b c", project: "p?x#y" }'));
		fireEvent.click(screen.getByText('submit'));
		await waitFor(() => expect(fetcher).toHaveBeenCalled());
		expect(fetcher.mock.calls[0]![0]).toBe('PATCH /api/files/a%2Fb%20c?project=p%3Fx%23y');
	});

	it('strictParams fails before any request on a missing placeholder, with a named error shown to the user', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const { fetcher } = renderPage(PAGE('    strictParams: true', '{ id: "7", project: "" }'));
		fireEvent.click(screen.getByText('submit'));
		const alert = await screen.findByRole('alert');
		expect(alert.textContent).toContain('[$ctx.rename] URL placeholder {project} has no value');
		expect(alert.textContent).toContain('available: id');
		expect(fetcher).not.toHaveBeenCalled();
	});
});
