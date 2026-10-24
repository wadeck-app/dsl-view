import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
	buildEntriesFile,
	collectYamlTypeReferences,
	entriesGenerator,
	findNodeModulesForPackage,
	generateKnownKeysManifest,
	relativeImportPath,
	resolvePackageComponentsDir,
	resolveWatchDirs,
} from './entriesGenerator.js';

// A small component library written to a temp directory. Each file exercises one branch of discovery
// (tags, bind patterns, contexts, lazy, generics, slots, skipped functions).
const FIXTURE_FILES: Record<string, string> = {
	'layout/Card.tsx': `
import React from 'react';
export interface CardProps {
	title?: string;
	/** @slot tag:layout, tag:atomic */
	children: React.ReactNode;
	/** @slot tag:atomic */
	footer?: React.ReactNode;
	className?: string;
	'aria-label'?: string;
	'data-testid'?: string;
}
/**
 * @registryCategory disposition
 * @registryTags layout container
 */
export function Card(props: CardProps) { return null }
`,
	'form/FieldText.tsx': `
export interface FieldTextProps {
	bind?: string;
	value: string;
	onChange: (v: string) => void;
	label?: string;
}
/**
 * @registryCategory form
 * @registryBind formData onChange
 */
export function FieldText(props: FieldTextProps) { return null }
`,
	'form/Switch.tsx': `
export interface SwitchProps {
	checked: boolean;
	onChange: (v: boolean) => void;
	label?: string;
}
/**
 * @registryCategory form
 * @registryBind formData onChange
 */
export function Switch(props: SwitchProps) { return null }
`,
	'form/NumberField.tsx': `
export interface NumberFieldProps {
	value: number;
	onChange: (v: number) => void;
}
/**
 * @registryCategory form
 * @registryBind formData onChange
 */
export function NumberField(props: NumberFieldProps) { return null }
`,
	'form/Tags.tsx': `
export interface TagsProps {
	value: string[];
	onChange: (v: string[]) => void;
}
/**
 * @registryCategory form
 * @registryBind formData onChange
 */
export function Tags(props: TagsProps) { return null }
`,
	'form/DatePick.tsx': `
export interface DatePickProps {
	value: Date | null;
	onChange: (v: Date | null) => void;
}
/**
 * @registryCategory form
 * @registryBind formData onChange
 */
export function DatePick(props: DatePickProps) { return null }
`,
	'form/RangePick.tsx': `
interface DateRange { from: Date | null; to: Date | null }
export interface RangePickProps {
	value: DateRange | null;
	onChange: (v: DateRange | null) => void;
}
/**
 * @registryCategory form
 * @registryBind formData onChange
 */
export function RangePick(props: RangePickProps) { return null }
`,
	'form/BoundWithBind.tsx': `
export interface BoundWithBindProps {
	bind: string;
	value: string;
	onChange: (v: string) => void;
}
/**
 * @registryCategory form
 * @registryBind formData onChange
 */
export function BoundWithBind(props: BoundWithBindProps) { return null }
`,
	'form/BoundWithSlot.tsx': `
import React from 'react';
export interface BoundWithSlotProps {
	value: string;
	onChange: (v: string) => void;
	/** @slot tag:atomic */
	hint?: React.ReactNode;
}
/**
 * @registryCategory form
 * @registryBind formData onChange
 */
export function BoundWithSlot(props: BoundWithSlotProps) { return null }
`,
	'charts/Heavy.tsx': `
export interface HeavyProps { data: unknown[] }
/**
 * @registryCategory composite
 * @registryLazy
 */
export function Heavy(props: HeavyProps) { return null }
`,
	'display/NoProps.tsx': `
/** @registryCategory atomic */
export function NoProps() { return null }
`,
	'display/Empty.tsx': `
export interface EmptyProps {}
/** @registryCategory atomic */
export function Empty(props: EmptyProps) { return null }
`,
	'display/Table.tsx': `
import React from 'react';
export interface TableProps<T extends Record<string, unknown>> {
	rows: T[];
	/** @ctxDefault */
	onAction?: (name: string) => void;
	renderNode?: (node: unknown, ctx: Record<string, unknown>) => React.ReactNode;
}
/** @registryCategory composite */
export function Table<T extends Record<string, unknown>>(props: TableProps<T>) { return null }
`,
	'display/Plain.tsx': `
export interface PlainProps {
	title: string;
	'aria-label'?: string;
	'data-x'?: string;
	'not valid'?: string;
	ref?: unknown;
	style?: unknown;
	key?: string;
}
/** @registryCategory atomic */
export function Plain(props: PlainProps) { return null }
`,
	'skipped/Helpers.tsx': `
export interface HiddenProps { a: string }
/** @registryCategory atomic */
function NotExported(props: HiddenProps) { return null }
/** @registryCategory atomic */
export function lowercase(props: HiddenProps) { return null }
/** documented but no registry category */
export function NoCategory(props: HiddenProps) { return null }
export function NoJsDoc(props: HiddenProps) { return null }
`,
	'context/ThemeThing.tsx': `
import React from 'react';
export const ThemeCtx = React.createContext<string>('light');
/** @registryCategory atomic */
export function ThemeProviderThing(props: { children: React.ReactNode }) {
	return <ThemeCtx.Provider value="dark">{props.children}</ThemeCtx.Provider>;
}
`,
	'context/useTheme.tsx': `
import React from 'react';
import { ThemeCtx } from './ThemeThing';
export function useTheme() { return React.useContext(ThemeCtx); }
export function useNothing() { return 1; }
`,
	'context/Consumer.tsx': `
import React from 'react';
import { ThemeCtx } from './ThemeThing';
import { useTheme } from './useTheme';
/** @registryCategory atomic */
export function DirectConsumer() { const t = React.useContext(ThemeCtx); return null }
/** @registryCategory atomic */
export function WrappedConsumer() { const t = useTheme(); return null }
/** @registryCategory atomic */
export function MemberWrappedConsumer() { const t = hooks.useTheme(); return null }
`,
	// Tests, stories and specs are never components, even when they carry the tag, and are not scanned for hooks either.
	'layout/Card.stories.tsx': `
/** @registryCategory atomic */
export function StoryOnly() { return null }
`,
	'layout/Card.test.tsx': `
/** @registryCategory atomic */
export function TestOnly() { return null }
`,
	'layout/Card.spec.tsx': `
import React from 'react';
import { ThemeCtx } from '../context/ThemeThing';
/** @registryCategory atomic */
export function SpecOnly() { return null }
export function useSpecHook() { return React.useContext(ThemeCtx); }
`,
	'notes.ts': `export const ignored = true;`,
};

function writeFixture(root: string, files: Record<string, string> = FIXTURE_FILES): void {
	for (const [relative, content] of Object.entries(files)) {
		const abs = path.join(root, relative);
		fs.mkdirSync(path.dirname(abs), { recursive: true });
		fs.writeFileSync(abs, content);
	}
}

function makeTempDir(prefix: string): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// Discovery runs ts-morph over a real component library: a little slower than a unit test.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

let root: string;
let componentsDir: string;
let appRoot: string;
let out: string;
let packageOut: string;

const importOf = (name: string, group: string) => `import { ${name} } from '../../../../packages/dsl-ui/src/components/${group}/${name}.js'`;

beforeAll(() => {
	root = makeTempDir('entries-pipeline-');
	componentsDir = path.join(root, 'ws', 'packages', 'dsl-ui', 'src', 'components');
	writeFixture(componentsDir);
	appRoot = path.join(root, 'ws', 'apps', 'app');
	fs.mkdirSync(appRoot, { recursive: true });
	out = buildEntriesFile(appRoot, [{ pkg: 'dsl-ui', absDir: componentsDir }]);
	packageOut = buildEntriesFile(appRoot, [{ pkg: 'dsl-ui', absDir: componentsDir }], undefined, { usePackageImports: true });
});

afterAll(() => {
	fs.rmSync(root, { recursive: true, force: true });
});

describe('component discovery', () => {
	it('registers exactly the exported, capitalised, documented functions that carry @registryCategory', () => {
		const names = [...out.matchAll(/^export const (\w+)Entry: ComponentRegistryEntry/gm)].map((m) => m[1]);
		expect(names.sort()).toEqual(
			[
				'BoundWithBind', 'BoundWithSlot', 'Card', 'DatePick', 'DirectConsumer', 'Empty', 'FieldText', 'Heavy',
				'MemberWrappedConsumer', 'NoProps', 'NumberField', 'Plain', 'RangePick', 'Switch', 'Table', 'Tags', 'ThemeProviderThing', 'WrappedConsumer',
			].sort()
		);
		for (const skipped of ['NotExported', 'lowercase', 'NoCategory', 'NoJsDoc', 'ignored', 'StoryOnly', 'TestOnly', 'SpecOnly', 'useSpecHook']) {
			expect(out).not.toContain(skipped);
		}
	});

	it('lists every entry in allEntries, in the order they were declared', () => {
		const declared = [...out.matchAll(/^export const (\w+Entry): ComponentRegistryEntry/gm)].map((m) => m[1]);
		const listed = out.slice(out.indexOf('export const allEntries'), out.indexOf(']\n', out.indexOf('export const allEntries')));
		expect([...listed.matchAll(/\t(\w+Entry),/g)].map((m) => m[1])).toEqual(declared);
	});

	it('writes name, category and tags of an entry, with a schema placeholder', () => {
		expect(out).toContain(`export const CardEntry: ComponentRegistryEntry = {
	name: 'Card', category: 'disposition', tags: ["layout","container"],
	nodeSchema: null as never,`);
		expect(out).toContain(`name: 'Plain', category: 'atomic', tags: [],`);
	});

	it('imports each component from its file, relative to the generated directory', () => {
		for (const [name, group] of [['Card', 'layout'], ['FieldText', 'form'], ['Plain', 'display'], ['Table', 'display']]) {
			expect(out).toContain(importOf(name!, group!));
		}
		expect(out).toContain("import { ThemeProviderThing } from '../../../../packages/dsl-ui/src/components/context/ThemeThing.js'");
	});
});

describe('metadata block', () => {
	it('emits slots, known keys and contexts per entry, and nothing for empty metadata', () => {
		expect(out).toContain('CardEntry.allowedChildren = {"items":["layout","atomic"],"footer":["atomic"]};');
		expect(out).toContain('CardEntry.knownKeys = ["aria-label","footer","items","title"];');
		expect(out).toContain('EmptyEntry.knownKeys = [];');
		expect(out).not.toContain('EmptyEntry.allowedChildren');
		expect(out).not.toContain('EmptyEntry.providesContext');
		expect(out).not.toContain('EmptyEntry.requiresContext');
		expect(out).not.toContain('mapSlots');
		expect(out).not.toContain('itemKeys');
	});

	it('detects provided and required contexts, directly and through a use* wrapper hook', () => {
		expect(out).toContain('ThemeProviderThingEntry.providesContext = ["ThemeCtx"];');
		expect(out).not.toContain('ThemeProviderThingEntry.requiresContext');
		for (const name of ['DirectConsumer', 'WrappedConsumer', 'MemberWrappedConsumer']) {
			expect(out).toContain(`${name}Entry.requiresContext = ["ThemeCtx"];`);
			expect(out).not.toContain(`${name}Entry.providesContext`);
		}
	});

	it('is the same data the manifest carries, sorted by component name', () => {
		const manifest = generateKnownKeysManifest([componentsDir]);
		expect(Object.keys(manifest)).toEqual(Object.keys(manifest).slice().sort((a, b) => a.localeCompare(b)));
		expect(manifest['Card']).toEqual({
			knownKeys: ['aria-label', 'footer', 'items', 'title'],
			allowedChildren: { items: ['layout', 'atomic'], footer: ['atomic'] },
		});
		expect(manifest['Empty']).toEqual({ knownKeys: [] });
		expect(manifest['FieldText']).toEqual({ knownKeys: ['bind', 'label'] });
		expect(Object.keys(manifest)).toHaveLength(18);
	});
});

describe('generated render blocks', () => {
	it('reads authorable props from the node: hyphenated names get a camelCase variable, internal props are skipped', () => {
		expect(out).toContain("const ariaLabel = (resolveExpressionValue(node['aria-label'], ctx))");
		expect(out).toContain('<Plain title={title} aria-label={ariaLabel} />');
		for (const skipped of ["node['data-x']", "node['not valid']", "node['ref']", "node['style']", "node['key']", "node['className']", "node['data-testid']"]) {
			expect(out).not.toContain(skipped);
		}
	});

	it('renders a ReactNode children prop from items and a named ReactNode slot from its own key', () => {
		expect(out).toContain("const items = node['items'] as unknown[] | undefined");
		expect(out).toContain("const footer = node['footer'] as unknown[] | undefined");
		expect(out).toContain('footer={footer ? renderChildren(footer, registry, ctx) : null}');
		expect(out).toContain('{items ? renderChildren(items, registry, ctx) : null}');
		expect(out).toContain('render: ({ node, registry, ctx }: RegistryRenderProps) => {');
	});

	it('declares the generic type arguments of a generic Props interface', () => {
		expect(out).toContain("TableProps<Record<string, unknown>>['rows']");
		expect(out).toContain("(resolveExpressionValue(node['onAction'], ctx) ?? ctx['onAction'])");
		expect(out).toContain('const renderNode = (n: unknown, extraCtx: Record<string, unknown>) => renderChildren([n], registry, { ...ctx, ...extraCtx })[0] ?? null');
		expect(out).toContain('<Table rows={rows} onAction={onAction} renderNode={renderNode} />');
	});

	it('renders a component with an empty Props interface without reading anything', () => {
		expect(out).toContain('render: () => <Empty />,');
	});

	it('forwards the page context to the children of a component that has no Props interface', () => {
		expect(out).toContain(`render: ({ node, registry, ctx }: RegistryRenderProps) => {
		const items = node['items'] as unknown[] | undefined
		return <NoProps>{items ? renderChildren(items, registry, ctx) : null}</NoProps>
	},`);
		expect(out).not.toContain('renderChildren(items, registry, {})');
	});

	it('wraps a lazy component and passes its props through', () => {
		expect(out).toContain("const HeavyLazy = React.lazy(() => import('../../../../packages/dsl-ui/src/components/charts/Heavy.js').then(m => ({ default: m.Heavy })))");
		expect(out).toContain('const Heavy = (props: React.ComponentProps<typeof HeavyLazy>) => <LazyBoundary><HeavyLazy {...props} /></LazyBoundary>');
		expect(out).toContain("import { LazyBoundary } from '../../../dsl-renderer/src/engine/LazyBoundary.js'");
		expect(out).not.toContain("import { Heavy }");
	});
});

describe('bind-pattern wrappers', () => {
	const wrapper = (name: string) => {
		const start = out.indexOf(`function ${name}WithContext(`);
		return out.slice(start, out.indexOf('\n}\n', start));
	};

	it('declares each wrapper once at module scope and renders it from the entry', () => {
		for (const name of ['FieldText', 'Switch', 'NumberField', 'Tags', 'DatePick', 'RangePick', 'BoundWithBind', 'BoundWithSlot']) {
			expect([...out.matchAll(new RegExp(`function ${name}WithContext\\(`, 'g'))]).toHaveLength(1);
			expect(out).toContain(`render: (props: RegistryRenderProps) => <${name}WithContext {...props} />,`);
			expect(out.indexOf(`function ${name}WithContext(`)).toBeLessThan(out.indexOf(`export const ${name}Entry`));
		}
		expect(out).toContain('// ─── Stable wrapper components (module scope: one declared inside render would remount its field on every render) ───');
		expect(out).toContain("import { useFormContext } from '../../../dsl-ui/src/components/form/Form.js'");
	});

	it('reads the form data from the form context, then from the page context', () => {
		const text = wrapper('FieldText');
		expect(text).toContain("const bind = node['bind'] as string");
		expect(text).toContain('const formCtx = useFormContext()');
		expect(text).toContain("const formData = formCtx?.formData ?? (ctx['formData'] ?? ctx['row']) as Record<string, unknown> | undefined");
		expect(text).toContain("const onChange = formCtx?.onChange ?? ctx['onChange'] as ((key: string, v: unknown) => void) | undefined");
		expect(text).toContain('onChange={(v) => onChange?.(bind, v)}');
	});

	it.each([
		['FieldText', "value={String(formData?.[bind] ?? '')}"],
		['Switch', 'checked={Boolean(formData?.[bind])}'],
		['NumberField', 'value={Number(formData?.[bind] ?? 0)}'],
		['Tags', 'value={(formData?.[bind] as string[] | undefined) ?? []}'],
		['DatePick', 'value={formData?.[bind] ? new Date(String(formData?.[bind])) : null}'],
		['RangePick', 'value={(formData?.[bind] as { from: Date | null; to: Date | null } | undefined) ?? { from: new Date(), to: null }}'],
	])('%s binds its value with the expression for its type', (name, expected) => {
		expect(wrapper(name)).toContain(expected);
	});

	it('does not pass a bound prop that is not a value to a toggle, and passes `checked` instead of `value`', () => {
		expect(wrapper('Switch')).not.toContain(' value=');
		expect(wrapper('FieldText')).not.toContain(' checked=');
	});

	it('passes bind={bind} only to a component that declares a bind prop', () => {
		expect(wrapper('BoundWithBind')).toContain('<BoundWithBind bind={bind} value=');
		expect(wrapper('FieldText')).toContain('<FieldText bind={bind} label={label} value=');
		expect(wrapper('NumberField')).not.toContain('bind={bind}');
		expect(wrapper('Tags')).not.toContain('bind={bind}');
	});

	it('destructures registry only for a wrapper whose slot uses it', () => {
		expect(wrapper('BoundWithSlot')).toContain('function BoundWithSlotWithContext({ node, registry, ctx }: RegistryRenderProps) {');
		expect(wrapper('BoundWithSlot')).toContain('hint={hint ? renderChildren(hint, registry, ctx) : null}');
		expect(wrapper('FieldText')).toContain('function FieldTextWithContext({ node, ctx }: RegistryRenderProps) {');
	});

	it('lists the bound component other props before its bound value', () => {
		expect(wrapper('FieldText')).toContain("const label = (resolveExpressionValue(node['label'], ctx)) as import('../../../../packages/dsl-ui/src/components/form/FieldText.js').FieldTextProps['label']");
	});
});

describe('imports', () => {
	it('imports the renderer helpers and the registry types, and the form hook only when something is bound', () => {
		expect(out).toContain("import React from 'react'");
		expect(out).toContain("import { renderChildren, resolveExpressionValue } from '../../../dsl-renderer/src/engine/DslRenderer.js'");
		expect(out).toContain("import type { ComponentRegistryEntry, RegistryRenderProps } from '../../../dsl-renderer/src/ComponentRegistry.js'");
		const plain = buildEntriesFile(appRoot, [{ pkg: 'x', absDir: path.join(componentsDir, 'display') }]);
		expect(plain).not.toContain('useFormContext');
		expect(plain).not.toContain('LazyBoundary');
		expect(plain).not.toContain('Stable wrapper components');
	});

	it('uses package names instead of monorepo-relative paths when running as an installed package', () => {
		expect(packageOut).toContain("import { renderChildren, resolveExpressionValue } from '@wadeck-app/dsl-renderer'");
		expect(packageOut).toContain("import type { ComponentRegistryEntry, RegistryRenderProps } from '@wadeck-app/dsl-renderer'");
		expect(packageOut).toContain("import { useFormContext } from '@wadeck-app/dsl-ui'");
		expect(packageOut).toContain("import { LazyBoundary } from '@wadeck-app/dsl-renderer'");
		expect(packageOut).not.toContain('../../../dsl-renderer');
		expect(packageOut).not.toContain('../../../dsl-ui/src/components/form/Form.js');
	});

	it('rebuilds the same file for the same input', () => {
		expect(buildEntriesFile(appRoot, [{ pkg: 'dsl-ui', absDir: componentsDir }])).toBe(out);
	});

	it('accepts the test-only single-argument form with an explicit component list', () => {
		const text = buildEntriesFile([
			{ name: 'Plain', category: 'atomic', tags: [], bindPattern: null, lazy: false, allowedChildren: {}, providesContext: [], requiresContext: [], sourcePath: path.join(componentsDir, 'display', 'Plain.tsx') },
		]);
		expect(text).toContain('export const PlainEntry');
		expect(text).not.toContain('ThemeProviderThing');
	});
});

describe('relativeImportPath', () => {
	it('rewrites a source file of an installed @wadeck-app package to its compiled dist path', () => {
		expect(relativeImportPath('/ws/node_modules/@wadeck-app/dsl-ui/src/components/layout/PageContent.tsx', '/ws/app/src/generated')).toBe(
			'@wadeck-app/dsl-ui/dist/components/layout/PageContent.js'
		);
	});

	it('handles an unscoped package, and a file outside src/', () => {
		expect(relativeImportPath('/ws/node_modules/orch-ui/src/Foo.tsx', '/ws/app/src/generated')).toBe('orch-ui/dist/Foo.js');
		expect(relativeImportPath('/ws/node_modules/orch-ui/lib/Foo.tsx', '/ws/app/src/generated')).toBe('orch-ui/lib/Foo.js');
	});

	it('accepts Windows separators in an installed path', () => {
		expect(relativeImportPath('C:\\ws\\node_modules\\@wadeck-app\\dsl-ui\\src\\a\\B.tsx'.split('\\').join(path.sep), '/ws/app/src/generated')).toMatch(
			/^(@wadeck-app\/dsl-ui\/dist\/a\/B\.js|\.{1,2}\/.*B\.js)$/
		);
	});

	it('builds a relative path with an explicit ./ prefix for a sibling and ../ for the rest', () => {
		const outputDir = path.resolve('/ws/app/src/generated');
		expect(relativeImportPath(path.resolve('/ws/app/src/generated/X.tsx'), outputDir)).toBe('./X.js');
		expect(relativeImportPath(path.resolve('/ws/app/src/generated/sub/X.tsx'), outputDir)).toBe('./sub/X.js');
		expect(relativeImportPath(path.resolve('/ws/packages/ui/src/X.tsx'), outputDir)).toBe('../../../packages/ui/src/X.js');
	});
});

describe('collectYamlTypeReferences', () => {
	it('collects component names from every page, quoted or not, several per line, ignoring comments and expressions', () => {
		const pages = path.join(root, 'pages-scan');
		fs.mkdirSync(pages, { recursive: true });
		fs.writeFileSync(
			path.join(pages, 'b.yaml'),
			[
				'$type: Page',
				'items:',
				'  - $type: Card',
				'  - $type: "Quoted"',
				"  - $type: 'Single'",
				'  # - $type: Commented',
				'  - { $type: InlineA, items: [{ $type: InlineB }] }',
				'  - $type: mod:Namespaced # trailing comment $type: InComment',
				'  - $type: $ctx.kind',
				'',
			].join('\n')
		);
		fs.writeFileSync(path.join(pages, 'a.yaml'), '$type: FromA\r\nitems:\r\n  - $type: Crlf\r\n');
		fs.writeFileSync(path.join(pages, 'notes.md'), '$type: NotYaml\n');
		expect([...collectYamlTypeReferences(pages)]).toEqual([
			'FromA', 'Crlf', 'Page', 'Card', 'Quoted', 'Single', 'InlineA', 'InlineB', 'mod:Namespaced',
		]);
	});

	it('returns nothing for a directory that does not exist', () => {
		expect(collectYamlTypeReferences(path.join(root, 'nope')).size).toBe(0);
	});
});

describe('guard-rails (loud, never silent)', () => {
	it('warns about page types that no scanned component provides, but not about built-ins or namespaced types', () => {
		const app = path.join(root, 'ws', 'apps', 'guarded');
		fs.mkdirSync(path.join(app, 'src', 'dsl', 'pages'), { recursive: true });
		fs.writeFileSync(
			path.join(app, 'src', 'dsl', 'pages', 'home.yaml'),
			'$type: Card\nitems:\n  - $type: MissingThing\n  - $type: ExtensionSlot\n  - $type: lib:Widget\n  - $type: AnotherMissing\n'
		);
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		try {
			buildEntriesFile(app, [{ pkg: 'dsl-ui', absDir: path.join(componentsDir, 'layout') }]);
			expect(warn).toHaveBeenCalledTimes(1);
			expect(warn.mock.calls[0]![0]).toBe(
				'[entriesGenerator] src/dsl/pages uses $type(s) that no scanned component provides: MissingThing, AnotherMissing. ' +
					'If a component of a scanned package is meant to be one of them, add a @registryCategory JSDoc tag to it; ignore this for components you register by hand.'
			);
		} finally {
			warn.mockRestore();
		}
	});

	it('stays quiet when every page type is provided', () => {
		const app = path.join(root, 'ws', 'apps', 'quiet');
		fs.mkdirSync(path.join(app, 'src', 'dsl', 'pages'), { recursive: true });
		fs.writeFileSync(path.join(app, 'src', 'dsl', 'pages', 'home.yaml'), '$type: Card\n');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		try {
			buildEntriesFile(app, [{ pkg: 'dsl-ui', absDir: path.join(componentsDir, 'layout') }]);
			expect(warn).not.toHaveBeenCalled();
		} finally {
			warn.mockRestore();
		}
	});

	it('warns, naming the package and the directory, when a configured components directory does not exist', () => {
		const missing = path.join(root, 'ws', 'packages', 'ghost-ui', 'src', 'components');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		try {
			const text = buildEntriesFile(appRoot, [{ pkg: 'ghost-ui', absDir: missing }]);
			expect(text).not.toContain('Entry: ComponentRegistryEntry');
			expect(warn).toHaveBeenCalledWith(
				`[entriesGenerator] components directory not found for package "ghost-ui": ${missing}. ` +
					'Its components will be missing from the registry - check the package name in dsl.config.yaml and that it is installed.'
			);
		} finally {
			warn.mockRestore();
		}
	});
});

describe('package directory resolution', () => {
	it('finds the nearest node_modules that holds the package, walking up, and null when there is none', () => {
		const base = path.join(root, 'nm');
		const deep = path.join(base, 'a', 'b', 'c');
		fs.mkdirSync(deep, { recursive: true });
		fs.mkdirSync(path.join(base, 'node_modules', '@wadeck-app', 'ui'), { recursive: true });
		expect(findNodeModulesForPackage(deep, '@wadeck-app/ui')).toBe(path.join(base, 'node_modules'));
		expect(findNodeModulesForPackage(base, '@wadeck-app/ui')).toBe(path.join(base, 'node_modules'));
		expect(findNodeModulesForPackage(deep, '@wadeck-app/absent-package-xyz')).toBeNull();
		// The nearest one wins.
		fs.mkdirSync(path.join(base, 'a', 'node_modules', '@wadeck-app', 'ui'), { recursive: true });
		expect(findNodeModulesForPackage(deep, '@wadeck-app/ui')).toBe(path.join(base, 'a', 'node_modules'));
	});

	it('gives up after eight levels instead of climbing forever', () => {
		const base = path.join(root, 'nm-far');
		let deep = base;
		for (let i = 0; i < 10; i++) deep = path.join(deep, `d${i}`);
		fs.mkdirSync(deep, { recursive: true });
		fs.mkdirSync(path.join(base, 'node_modules', 'far-pkg'), { recursive: true });
		expect(findNodeModulesForPackage(deep, 'far-pkg')).toBeNull();
		expect(findNodeModulesForPackage(path.join(base, 'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6'), 'far-pkg')).toBe(path.join(base, 'node_modules'));
	});

	describe('resolvePackageComponentsDir', () => {
		const make = (rel: string) => {
			const dir = path.join(root, rel);
			fs.mkdirSync(dir, { recursive: true });
			return dir;
		};

		it('prefers the dsl-view monorepo, then the app workspace, then node_modules, then the (missing) workspace path', () => {
			const monorepo = make('res1/mono');
			const app = make('res1/ws/apps/app');
			const monoComponents = make('res1/mono/packages/my-ui/src/components');
			const wsComponents = make('res1/ws/packages/my-ui/src/components');
			expect(resolvePackageComponentsDir('my-ui', monorepo, app)).toBe(monoComponents);
			fs.rmSync(monoComponents, { recursive: true });
			expect(resolvePackageComponentsDir('my-ui', monorepo, app)).toBe(wsComponents);
			fs.rmSync(wsComponents, { recursive: true });
			const nm = make('res1/ws/node_modules/@wadeck-app/my-ui/src/components');
			expect(resolvePackageComponentsDir('my-ui', monorepo, app)).toBe(nm);
			fs.rmSync(path.join(root, 'res1/ws/node_modules'), { recursive: true });
			expect(resolvePackageComponentsDir('my-ui', monorepo, app)).toBe(path.join(root, 'res1/ws/packages/my-ui/src/components'));
		});

		it('derives the short and the scoped npm name from either spelling', () => {
			const monorepo = make('res2/mono');
			const app = make('res2/ws/apps/app');
			const nm = make('res2/ws/node_modules/@scope/pkg/src/components');
			expect(resolvePackageComponentsDir('@scope/pkg', monorepo, app)).toBe(nm);
			// A bare name is looked up under the @wadeck-app scope.
			const wadeck = make('res2/ws/node_modules/@wadeck-app/bare/src/components');
			expect(resolvePackageComponentsDir('bare', monorepo, app)).toBe(wadeck);
			// A scoped name is looked up by its short name in packages/.
			const mono = make('res2/mono/packages/pkg/src/components');
			expect(resolvePackageComponentsDir('@scope/pkg', monorepo, app)).toBe(mono);
		});

		it('ignores an installed package that has no src/components directory', () => {
			const monorepo = make('res3/mono');
			const app = make('res3/ws/apps/app');
			make('res3/ws/node_modules/@wadeck-app/hollow');
			expect(resolvePackageComponentsDir('hollow', monorepo, app)).toBe(path.join(root, 'res3/ws/packages/hollow/src/components'));
		});
	});

	describe('resolveWatchDirs', () => {
		it('always starts with dsl-ui, then one directory per configured package', () => {
			const monorepo = path.join(root, 'res4', 'mono');
			const app = path.join(root, 'res4', 'ws', 'apps', 'app');
			const dirs = resolveWatchDirs({ packages: { a: 'one-ui', b: '@wadeck-app/two-ui' } }, monorepo, app);
			expect(dirs.map((d) => d.pkg)).toEqual(['dsl-ui', 'one-ui', '@wadeck-app/two-ui']);
			expect(dirs[0]!.absDir).toBe(path.join(root, 'res4', 'ws', 'packages', 'dsl-ui', 'src', 'components'));
			expect(resolveWatchDirs({}, monorepo, app).map((d) => d.pkg)).toEqual(['dsl-ui']);
		});
	});
});

describe('entriesGenerator Vite plugin', () => {
	type Hook = (arg?: unknown) => void;
	const setup = (opts: { withRenderer: boolean }) => {
		const monorepo = path.join(root, `plugin-${opts.withRenderer ? 'mono' : 'installed'}`);
		const app = path.join(monorepo, 'apps', 'app');
		fs.mkdirSync(app, { recursive: true });
		fs.mkdirSync(path.join(monorepo, 'packages', 'dsl-ui', 'src', 'components'), { recursive: true });
		fs.copyFileSync(path.join(componentsDir, 'display', 'Plain.tsx'), path.join(monorepo, 'packages', 'dsl-ui', 'src', 'components', 'Plain.tsx'));
		if (opts.withRenderer) fs.mkdirSync(path.join(monorepo, 'packages', 'dsl-renderer'), { recursive: true });
		const plugin = entriesGenerator({ monorepoRoot: monorepo });
		(plugin.configResolved as unknown as Hook)({ root: app });
		return { plugin, app, monorepo, output: path.join(app, 'src', 'generated', 'entries.tsx') };
	};

	it('is a Vite plugin named entries-generator that writes src/generated/entries.tsx at buildStart', () => {
		const { plugin, output } = setup({ withRenderer: true });
		expect(plugin.name).toBe('entries-generator');
		(plugin.buildStart as unknown as Hook)();
		const text = fs.readFileSync(output, 'utf-8');
		expect(text).toContain('export const PlainEntry');
		// Inside the dsl-view source tree it imports the renderer by relative path.
		expect(text).toContain("from '../../../dsl-renderer/src/engine/DslRenderer.js'");
	});

	it('imports by package name when it runs as an installed package (no dsl-renderer next to it)', () => {
		const { plugin, output } = setup({ withRenderer: false });
		(plugin.buildStart as unknown as Hook)();
		expect(fs.readFileSync(output, 'utf-8')).toContain("from '@wadeck-app/dsl-renderer'");
	});

	it('regenerates when a file of a watched components directory is hot-updated, however the path is spelled', () => {
		const { plugin, monorepo, output } = setup({ withRenderer: true });
		const hot = plugin.handleHotUpdate as unknown as (c: { file: string }) => void;
		const watched = path.join(monorepo, 'packages', 'dsl-ui', 'src', 'components', 'Plain.tsx');
		const regenerated = (file: string) => {
			fs.rmSync(output, { force: true });
			hot({ file });
			return fs.existsSync(output);
		};
		expect(regenerated(watched)).toBe(true);
		expect(regenerated(watched.replace(/\\/g, '/'))).toBe(true);
		expect(regenerated(path.join(monorepo, 'packages', 'dsl-ui', 'src', 'components-old', 'Plain.tsx'))).toBe(false);
		expect(regenerated(path.join(monorepo, 'packages', 'other', 'Plain.tsx'))).toBe(false);
	});

	it('reads extra packages from dsl.config.yaml', () => {
		const monorepo = path.join(root, 'plugin-config');
		const app = path.join(monorepo, 'apps', 'app');
		fs.mkdirSync(app, { recursive: true });
		const extra = path.join(monorepo, 'packages', 'extra-ui', 'src', 'components');
		fs.mkdirSync(extra, { recursive: true });
		fs.copyFileSync(path.join(componentsDir, 'display', 'Plain.tsx'), path.join(extra, 'Plain.tsx'));
		fs.writeFileSync(path.join(app, 'dsl.config.yaml'), 'packages:\n  extra: extra-ui\n');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		try {
			const plugin = entriesGenerator({ monorepoRoot: monorepo });
			(plugin.configResolved as unknown as Hook)({ root: app });
			(plugin.buildStart as unknown as Hook)();
			expect(fs.readFileSync(path.join(app, 'src', 'generated', 'entries.tsx'), 'utf-8')).toContain('export const PlainEntry');
			// dsl-ui itself is absent here: said out loud.
			expect(warn).toHaveBeenCalledWith(expect.stringContaining('components directory not found for package "dsl-ui"'));
		} finally {
			warn.mockRestore();
		}
	});
});
