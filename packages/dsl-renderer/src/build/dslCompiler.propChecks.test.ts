import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { ComponentRegistry } from '../ComponentRegistry.js';
import { compileDslDocument } from './dslCompiler.js';

const render = () => null;
const page = '$type: Box\nlabel: 42\n';

const withSchema = (): ComponentRegistry => ({
	Box: { name: 'Box', category: 'atomic', tags: [], nodeSchema: null as never, render, knownKeys: ['label'], propSchema: z.object({ label: z.string() }) },
});
const withoutSchema = (): ComponentRegistry => ({
	Box: { name: 'Box', category: 'atomic', tags: [], nodeSchema: null as never, render, knownKeys: ['label'] },
});
const handWritten = (): ComponentRegistry => ({
	Box: { name: 'Box', category: 'atomic', tags: [], nodeSchema: null as never, render },
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe('compileDslDocument, literal prop values', () => {
	it('fails a page whose literal prop value the component schema rejects', () => {
		vi.stubEnv('NODE_ENV', 'development');

		const artifact = compileDslDocument(page, withSchema());

		expect(artifact.diagnostics.map((d) => [d.severity, d.code])).toEqual([['error', 'invalid-prop-value']]);
	});

	// The generated entries leave propSchema out of a production build. A compile step run under NODE_ENV=production
	// would then pass every wrong value without a word: it has to say so.
	it('warns that prop checks were skipped when a generated registry carries no schemas under NODE_ENV=production', () => {
		vi.stubEnv('NODE_ENV', 'production');

		const artifact = compileDslDocument(page, withoutSchema());

		expect(artifact.diagnostics).toHaveLength(1);
		expect(artifact.diagnostics[0]).toMatchObject({ severity: 'warning', code: 'unchecked-props', type: '(registry)' });
		expect(artifact.diagnostics[0]!.message).toContain('NODE_ENV=development');
	});

	it('does not warn outside production, where an absent schema just means the library ships none', () => {
		vi.stubEnv('NODE_ENV', 'development');

		expect(compileDslDocument(page, withoutSchema()).diagnostics).toEqual([]);
	});

	it('does not warn when the registry does carry schemas, even under production', () => {
		vi.stubEnv('NODE_ENV', 'production');

		const codes = compileDslDocument(page, withSchema()).diagnostics.map((d) => d.code);

		expect(codes).toEqual(['invalid-prop-value']);
	});

	// A hand-written registry (no knownKeys either) is not a generated one: nothing was promised, nothing to warn about.
	it('does not add an unchecked-props warning for a hand-written registry', () => {
		vi.stubEnv('NODE_ENV', 'production');

		const codes = compileDslDocument('$type: Box\n', handWritten()).diagnostics.map((d) => d.code);

		expect(codes).not.toContain('unchecked-props');
	});
});
