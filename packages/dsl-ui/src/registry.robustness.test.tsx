import { render } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React, { Suspense } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { RouterProvider } from '@dsl-ui/components/navigation/RouterProvider.js';
import * as nodeSchemas from '@dsl-ui/schemas/generated-node-schemas.js';
import { ToastProvider } from '@dsl-ui/components/overlay/Toast.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const packagesDir = path.resolve(here, '../..');
// Workspace build of the renderer (see scripts/generate-known-keys.ts for why not node_modules).
const generatorPath = path.resolve(packagesDir, 'dsl-renderer/dist/build/entriesGenerator.js');
// The generated file imports ../../../dsl-ui/src relative to its own location, so it has to sit at
// <app>/src/generated inside packages/ to run against the real sources.
const appRoot = path.join(packagesDir, '__entries-robustness-app');

type KnownKeysEntry = { knownKeys?: string[] };
const knownKeys = JSON.parse(fs.readFileSync(path.join(here, 'known-keys.json'), 'utf8')) as Record<string, KnownKeysEntry>;

// What a page author, a half-loaded `$sources` value or a broken backend can hand to a prop.
const ODD_VALUES: ReadonlyArray<readonly [string, unknown]> = [
	['undefined', undefined],
	['null', null],
	['empty string', ''],
	['zero', 0],
	['false', false],
	['empty object', {}],
	['empty array', []],
	['text', 'text'],
	['number', 42],
	['array of empty objects', [{}]],
	['nested wrong shape', { nested: { wrong: [1, 'a', null] } }],
];

// Strings that look right to an author and are not: date-fns formats with moment-style tokens (`YYYY` and `DD` throw).
const FORMAT_VALUES: ReadonlyArray<readonly [string, unknown]> = [
	['moment-style format', 'YYYY-MM-DD'],
	['unknown letter format', 'yyyy j'],
];
const oddValuesFor = (key: string) => (/format/i.test(key) ? [...ODD_VALUES, ...FORMAT_VALUES] : ODD_VALUES);

/**
 * A valid minimal node per component that cannot render without configuration. Every odd value is applied on top
 * of it, one prop at a time, so the sweep checks "this value breaks an otherwise working component" and not
 * "a component without its required configuration fails".
 */
const BASELINE: Record<string, Record<string, unknown>> = {
	// Needs either urlParam or value + onChange; urlParam is the YAML way.
	SearchBar: { urlParam: 'q' },
};

/**
 * Errors a component throws ON PURPOSE for an authoring mistake that makes it unusable (the message tells the
 * author what to write). Keyed by `Component.prop` (`Component.*` for any prop); the message must match. Each
 * entry must still be hit, so a stale one fails the test instead of silently widening the whitelist.
 */
const INTENDED_ERRORS: Record<string, RegExp> = {
	// The baseline gives it urlParam; an unusable urlParam leaves it with no way to hold its text (a configuration error).
	'SearchBar.urlParam': /^\[SearchBar\] needs either "urlParam" or both "value" and "onChange"/,
	'SearchBar.resetUrlParams': /^resetUrlParams must be an array of non-empty URL param names/,
	'CompactSelect.resetUrlParams': /^resetUrlParams must be an array of non-empty URL param names/,
	'PageSizeSelect.resetUrlParams': /^resetUrlParams must be an array of non-empty URL param names/,
};

function isIntended(type: string, prop: string | null, message: string): boolean {
	const pattern = prop === null ? undefined : (INTENDED_ERRORS[`${type}.${prop}`] ?? INTENDED_ERRORS[`${type}.*`]);
	return pattern?.test(message) ?? false;
}

class Catcher extends React.Component<{ children: React.ReactNode; onError: (error: unknown) => void }, { failed: boolean }> {
	state = { failed: false };
	static getDerivedStateFromError() {
		return { failed: true };
	}
	componentDidCatch(error: unknown) {
		this.props.onError(error);
	}
	render() {
		return this.state.failed ? null : this.props.children;
	}
}

type Renderer = typeof import('../../dsl-renderer/dist/index.js');
let registry: ReturnType<Renderer['createRegistry']>;
let registeredTypes: string[] = [];
let DslRenderer: Renderer['DslRenderer'];

beforeAll(async () => {
	if (!fs.existsSync(generatorPath)) {
		throw new Error(`dsl-renderer is not built (${generatorPath} missing): run \`npm run build\` in packages/dsl-renderer first.`);
	}
	const { buildEntriesFile } = await import(/* @vite-ignore */ generatorPath);
	const content: string = buildEntriesFile(appRoot, [{ pkg: 'dsl-ui', absDir: path.join(packagesDir, 'dsl-ui/src/components') }]);
	const entriesPath = path.join(appRoot, 'src/generated/entries.tsx');
	fs.mkdirSync(path.dirname(entriesPath), { recursive: true });
	fs.writeFileSync(entriesPath, content);
	const { allEntries } = await import(/* @vite-ignore */ entriesPath);
	const renderer = await import('../../dsl-renderer/dist/index.js');
	registry = renderer.createRegistry(allEntries);
	registeredTypes = (allEntries as Array<{ name: string }>).map((entry) => entry.name);
	DslRenderer = renderer.DslRenderer;
	// Generating the entries of every component takes a while under a loaded machine.
}, 300_000);

afterAll(() => {
	fs.rmSync(appRoot, { recursive: true, force: true });
});

/** Renders `node` inside the providers a real page has and returns the first error that escaped, if any. */
function renderOnce(node: Record<string, unknown>, formData: Record<string, unknown>): unknown {
	let escaped: unknown;
	const view = render(
		<MemoryRouter>
			<RouterProvider>
				<ToastProvider>
					<Catcher onError={(error) => (escaped ??= error)}>
						<Suspense fallback={null}>
							<DslRenderer node={node} registry={registry} ctx={{ formData, onChange: () => {} }} />
						</Suspense>
					</Catcher>
				</ToastProvider>
			</RouterProvider>
		</MemoryRouter>,
	);
	view.unmount();
	return escaped;
}

interface SweepCase {
	label: string;
	/** The prop under test, null for the bare node and for a bound value. */
	prop: string | null;
	node: Record<string, unknown>;
	formData: Record<string, unknown>;
}

const GOOD_FORM_DATA = { field: '2026-10-24T10:00:00.000Z' };

function casesFor(type: string): SweepCase[] {
	const baseline = BASELINE[type] ?? {};
	const keys = knownKeys[type]?.knownKeys ?? [];
	const isBound = keys.includes('bind');
	// A bound component reads its value from formData[bind]; a bare bound node has no value, a valid one a date-like text.
	const base = { $type: type, ...baseline, ...(isBound ? { bind: 'field' } : {}) };
	const cases: SweepCase[] = [{ label: 'no props', prop: null, node: base, formData: {} }];
	for (const key of keys) {
		if (key === 'bind') {
			continue;
		}
		for (const [label, value] of oddValuesFor(key)) {
			// Format strings are only used on a value, so give the component one.
			cases.push({ label: `${key} = ${label}`, prop: key, node: { ...base, [key]: value }, formData: /format/i.test(key) ? GOOD_FORM_DATA : {} });
		}
	}
	if (isBound) {
		// The bound value is data too (a backend field of the wrong type).
		for (const [label, value] of ODD_VALUES) {
			cases.push({ label: `bound value = ${label}`, prop: null, node: base, formData: { field: value } });
		}
	}
	return cases;
}

const only = process.env['ROBUSTNESS_ONLY']?.split(',').filter(Boolean);
const types = Object.keys(knownKeys)
	.filter((type) => !only || only.includes(type))
	.sort();

// The sweep walks known-keys.json: a component missing from it would be skipped without anyone noticing.
describe('the sweep covers the whole registry', () => {
	it('every registered component has a known-keys entry, and every known-keys entry is registered', () => {
		expect(registeredTypes.filter((type) => !(type in knownKeys)).sort(), 'registered but absent from known-keys.json (never swept)').toEqual([]);
		expect(Object.keys(knownKeys).filter((type) => !registeredTypes.includes(type)).sort(), 'in known-keys.json but not registered').toEqual([]);
	});
});

describe('every registry component survives odd values for each prop it declares', () => {
	it.each(types)('%s', (type) => {
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const crashes: string[] = [];
		// Cases whose node the generated schema rejects but that rendered without a crash AND without any console output.
		const silent: string[] = [];
		const schema = (nodeSchemas as Record<string, { safeParse(value: unknown): { success: boolean } } | undefined>)[`${type}NodeSchema`];
		const intendedSeen = new Set<string>();
		const cases = casesFor(type);
		for (const { label, prop, node, formData } of cases) {
			const logsBefore = errorSpy.mock.calls.length + warnSpy.mock.calls.length;
			const escaped = renderOnce(node, formData);
			if (escaped === undefined) {
				const quiet = errorSpy.mock.calls.length + warnSpy.mock.calls.length === logsBefore;
				if (quiet && prop !== null && schema && !schema.safeParse(node).success) {
					silent.push(label);
				}
				continue;
			}
			const message = escaped instanceof Error ? escaped.message : String(escaped);
			if (isIntended(type, prop, message)) {
				intendedSeen.add(`${type}.${prop}`);
				continue;
			}
			crashes.push(`${label}: ${message}`);
		}
		// Optional machine-readable dump for triage (not used by the assertions).
		const dump = process.env['ROBUSTNESS_REPORT'];
		if (dump) {
			fs.appendFileSync(dump, `${JSON.stringify({ type, cases: cases.length, crashes, silent })}\n`);
		}
		// A whitelist entry that is never hit is stale: it would hide a regression if the component started to throw again.
		const stale = Object.keys(INTENDED_ERRORS).filter((key) => key.startsWith(`${type}.`) && !intendedSeen.has(key) && (only === undefined || only.includes(type)));
		expect(stale, 'INTENDED_ERRORS entries that no longer throw: remove them').toEqual([]);
		// Joined into one string so the failure message lists every crash instead of an array summary.
		expect(crashes.join('\n')).toBe('');
	}, 120_000);
});
