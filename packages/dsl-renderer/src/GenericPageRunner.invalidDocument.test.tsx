import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

import { createRegistry } from './ComponentRegistry.js';
import { GenericPageRunner } from './GenericPageRunner.js';

const registry = createRegistry([]);

function renderYaml(yamlText: string | undefined) {
	return render(
		<MemoryRouter>
			<GenericPageRunner yamlText={yamlText} registry={registry} fetcher={vi.fn()} brainRegistry={{}} />
		</MemoryRouter>
	);
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('GenericPageRunner with a document that is not a page', () => {
	// React logs the thrown render error; keep the test output readable.
	const silence = () => vi.spyOn(console, 'error').mockImplementation(() => undefined);

	it('names the problem for a comment-only (empty) document', () => {
		silence();
		expect(() => renderYaml('# nothing here\n')).toThrow('The page YAML must be a mapping with a $type (got an empty document)');
	});

	it('names the problem for a scalar document', () => {
		silence();
		expect(() => renderYaml('just text')).toThrow('(got a string)');
	});

	it('names the problem for a list document', () => {
		silence();
		expect(() => renderYaml('- $type: Label')).toThrow('(got a list)');
	});

	it('asks for yamlText or compiled when neither is given', () => {
		silence();
		expect(() => renderYaml(undefined)).toThrow('Either `yamlText` or `compiled` must be provided.');
	});

	it('still renders a mapping page', () => {
		const view = renderYaml('$type: Missing\n');
		expect(view.container.textContent).toContain('Unknown component type');
	});
});
