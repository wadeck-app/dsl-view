/**
 * entriesGenerator - Generic DSL entries generator for dsl-*-app packages.
 *
 * Moved from dsl-wdrive-app/src/build/entriesGenerator.ts to dsl-renderer/src/build/.
 * Each app declares its package dependencies in dsl.config.yaml; this generator
 * auto-produces src/generated/entries.tsx for any dsl-*-app.
 *
 * Compared to the old wdrive-specific generator, this version is intentionally simpler:
 * - No AUTO_GENERATED_COMPONENTS / per-component wiring hints
 * - No ctxSourceProp / urlBackedPairs / ctxFixedKeyProps etc. — YAML now declares wiring
 * - Props classified as: ReactNode slot → renderChildren, @registryBind → FormContext,
 *   everything else → node['propName'] as PropType (direct cast)
 */

import fs from 'fs';
import path from 'path';
import { Node, Project, SyntaxKind } from 'ts-morph';
import type { FunctionDeclaration } from 'ts-morph';
import { load as parseYaml } from 'js-yaml';
import { fileURLToPath } from 'url';
import type { Plugin } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── dsl.config.yaml reader ───────────────────────────────────────────────────

interface DslConfig {
	packages: Record<string, string>;
}

function readDslConfig(appRoot: string): DslConfig {
	const configPath = path.join(appRoot, 'dsl.config.yaml');
	if (!fs.existsSync(configPath)) {
		return { packages: {} };
	}
	const raw = parseYaml(fs.readFileSync(configPath, 'utf-8')) as { packages?: Record<string, string> } | null;
	return { packages: raw?.packages ?? {} };
}

/** Find the node_modules directory that actually contains the given package. */
function findNodeModulesForPackage(startDir: string, pkgName: string): string | null {
	let dir = startDir;
	for (let i = 0; i < 8; i++) {
		const candidate = path.join(dir, 'node_modules', pkgName);
		if (fs.existsSync(candidate)) return path.join(dir, 'node_modules');
		const parent = path.dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	return null;
}

/** Resolve the src/components directory for an npm package name.
 *  Tries in order: monorepo packages/, workspace packages/, node_modules. */
function resolvePackageComponentsDir(
	npmPkgName: string,
	monorepoRoot: string,
	appRoot: string
): string {
	// Short name: e.g. "dsl-ui" from "@wadeck-app/dsl-ui", or bare "orch-ui"
	const shortName = npmPkgName.includes('/') ? npmPkgName.split('/').pop()! : npmPkgName;
	// Full npm name: ensure scoped format "@wadeck-app/..."
	const fullNpmName = npmPkgName.includes('/') ? npmPkgName : `@wadeck-app/${npmPkgName}`;

	// 1. Try dsl-view monorepo packages/ (used when running from source)
	const monorepoPath = path.resolve(monorepoRoot, `packages/${shortName}/src/components`);
	if (fs.existsSync(monorepoPath)) return monorepoPath;

	// 2. Try the consuming project's workspace packages/
	const workspaceRoot = path.resolve(appRoot, '../..');
	const workspacePath = path.resolve(workspaceRoot, `packages/${shortName}/src/components`);
	if (fs.existsSync(workspacePath)) return workspacePath;

	// 3. Try node_modules (installed npm package) — search up from appRoot
	//    to find the node_modules that actually contains the hoisted package.
	const nodeModules = findNodeModulesForPackage(appRoot, fullNpmName);
	if (nodeModules) {
		const npmPath = path.join(nodeModules, fullNpmName, 'src', 'components');
		if (fs.existsSync(npmPath)) return npmPath;
	}

	// Return the workspace path even if missing — will be skipped during scan
	return workspacePath;
}

function resolveWatchDirs(
	config: DslConfig,
	monorepoRoot: string,
	appRoot: string
): Array<{ pkg: string; absDir: string }> {
	const dirs: Array<{ pkg: string; absDir: string }> = [
		{ pkg: 'dsl-ui', absDir: resolvePackageComponentsDir('dsl-ui', monorepoRoot, appRoot) },
	];
	for (const pkg of Object.values(config.packages)) {
		dirs.push({ pkg, absDir: resolvePackageComponentsDir(pkg, monorepoRoot, appRoot) });
	}
	return dirs;
}

// ─── Context helpers (reused from original generator) ────────────────────────

// AST-based call-expression matcher - only sees real call sites, never comments/strings.
function findCallExpressionArgIdentifiers(fn: FunctionDeclaration, calleeName: string): string[] {
	const names: string[] = [];
	for (const call of fn.getDescendantsOfKind(SyntaxKind.CallExpression)) {
		const expr = call.getExpression();
		const exprText = expr.getText();
		const calleeMatches = exprText === calleeName || exprText.endsWith(`.${calleeName}`);
		if (!calleeMatches) continue;
		const [arg] = call.getArguments();
		if (arg && Node.isIdentifier(arg)) names.push(arg.getText());
	}
	return names;
}

export function extractAllowedChildren(
	sourceFile: ReturnType<InstanceType<typeof Project>['addSourceFileAtPath']>,
	componentName: string
): Record<string, string[]> {
	const propsInterface = sourceFile.getInterface(componentName + 'Props');
	if (!propsInterface) return {};

	const result: Record<string, string[]> = {};
	for (const prop of propsInterface.getProperties()) {
		for (const doc of prop.getJsDocs()) {
			for (const tag of doc.getTags()) {
				if (tag.getTagName() === 'slot') {
					const text = tag.getCommentText()?.trim() ?? '';
					const tags = text
						.split(/,\s*/)
						.map(t => t.trim().replace(/^tag:/, ''))
						.filter(Boolean);
					if (tags.length > 0) {
						result[prop.getName()] = tags;
					}
				}
			}
		}
	}
	return result;
}

export function extractContextNames(
	sourceText: string,
	pattern: 'createContext' | 'useContext'
): string[] {
	const names: string[] = [];
	if (pattern === 'createContext') {
		const re = /(\w+)\s*=\s*(?:React\.)?createContext\s*[<(]/g;
		let match: RegExpExecArray | null;
		while ((match = re.exec(sourceText)) !== null) {
			if (match[1]) names.push(match[1]);
		}
	} else {
		const re = /useContext\s*\(\s*(\w+)\s*\)/g;
		let match: RegExpExecArray | null;
		while ((match = re.exec(sourceText)) !== null) {
			const name = match[1];
			if (name && !['null', 'undefined'].includes(name)) {
				names.push(name);
			}
		}
	}
	return [...new Set(names)];
}

export function extractProvidesContextFromProviderJsx(fn: FunctionDeclaration): string[] {
	const names: string[] = [];
	const openingElements = [
		...fn.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
		...fn.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
	];
	for (const el of openingElements) {
		const tagText = el.getTagNameNode().getText();
		const match = /^(\w+)\.Provider$/.exec(tagText);
		if (match?.[1]) names.push(match[1]);
	}
	return [...new Set(names)];
}

function collectContextHookWrappers(pkgDirs: string[]): Map<string, string[]> {
	const wrapperToContexts = new Map<string, string[]>();
	const project = new Project({ skipFileDependencyResolution: true });
	for (const dir of pkgDirs) {
		if (!fs.existsSync(dir)) continue;
		for (const file of (fs.readdirSync(dir, { recursive: true }) as string[]).filter(f => f.endsWith('.tsx'))) {
			const sourceFile = project.addSourceFileAtPath(path.join(dir, file));
			for (const fn of sourceFile.getFunctions()) {
				if (!fn.isExported()) continue;
				const name = fn.getName();
				if (!name || !/^use[A-Z]/.test(name)) continue;
				const contexts = findCallExpressionArgIdentifiers(fn, 'useContext');
				if (contexts.length > 0) wrapperToContexts.set(name, contexts);
			}
		}
	}
	return wrapperToContexts;
}

function extractRequiresContext(fn: FunctionDeclaration, hookWrappers: Map<string, string[]>): string[] {
	const direct = findCallExpressionArgIdentifiers(fn, 'useContext');
	const viaWrapper: string[] = [];
	for (const call of fn.getDescendantsOfKind(SyntaxKind.CallExpression)) {
		const exprText = call.getExpression().getText();
		const calleeName = exprText.includes('.') ? exprText.split('.').pop()! : exprText;
		const contexts = hookWrappers.get(calleeName);
		if (contexts) viaWrapper.push(...contexts);
	}
	return [...new Set([...direct, ...viaWrapper])];
}

// ─── Component discovery ───────────────────────────────────────────────────────

interface DiscoveredComponent {
	name: string;
	category: string;
	tags: string[];
	bindPattern: string[] | null;
	allowedChildren: Record<string, string[]>;
	providesContext: string[];
	requiresContext: string[];
	sourcePath: string;
}

function discoverComponents(srcDir: string, hookWrappers: Map<string, string[]>): DiscoveredComponent[] {
	if (!fs.existsSync(srcDir)) return [];

	const project = new Project({ skipFileDependencyResolution: true });
	const discovered: DiscoveredComponent[] = [];

	for (const file of (fs.readdirSync(srcDir, { recursive: true }) as string[]).filter(f => f.endsWith('.tsx'))) {
		const absPath = path.join(srcDir, file);
		const sourceFile = project.addSourceFileAtPath(absPath);
		for (const fn of sourceFile.getFunctions()) {
			if (!fn.isExported()) continue;
			const name = fn.getName();
			if (!name || !name[0] || name[0] !== name[0].toUpperCase()) continue;

			const jsDoc = fn.getJsDocs()[0];
			if (!jsDoc) continue;

			let category = '';
			let tags: string[] = [];
			let bindPattern: string[] | null = null;

			for (const tag of jsDoc.getTags()) {
				const tagName = tag.getTagName();
				const text = tag.getCommentText()?.trim() ?? '';
				if (tagName === 'registryCategory') category = text;
				else if (tagName === 'registryTags') tags = text.split(/\s+/).filter(Boolean);
				else if (tagName === 'registryBind') bindPattern = text.split(/\s+/).filter(Boolean);
			}

			if (category) {
				const allowedChildren = extractAllowedChildren(sourceFile, name);
				const providesContext = [...new Set([
					...extractContextNames(fn.getText(), 'createContext'),
					...extractProvidesContextFromProviderJsx(fn),
				])];
				const requiresContext = extractRequiresContext(fn, hookWrappers);
				discovered.push({ name, category, tags, bindPattern, allowedChildren, providesContext, requiresContext, sourcePath: absPath });
			}
		}
	}

	return discovered;
}

// ─── Simple render block generation ───────────────────────────────────────────
//
// The new generic model: every prop is one of:
//   - React.ReactNode (slot) → renderChildren(node['propName'], registry, ctx)
//   - Everything else → node['propName'] as import('...').ComponentNameProps['propName']
//
// Special case: @registryBind formData onChange → wrap with FormContext.
// No urlBackedPairs, no ctxSourceProp, no ctxFixedKeyProps. YAML declares all wiring.

function generateSimpleEntry(
	component: DiscoveredComponent,
	importPath: string
): string {
	const project = new Project({ skipFileDependencyResolution: true });
	const sourceFile = project.addSourceFileAtPath(component.sourcePath);
	const propsInterface = sourceFile.getInterface(`${component.name}Props`);

	if (!propsInterface) {
		// No Props interface found - generate a no-props render
		return `render: () => <${component.name} />,`;
	}

	const allProperties = propsInterface.getProperties();
	const bindPattern = component.bindPattern;
	// Only support the formData/onChange bind pattern (the one special case worth keeping)
	const isFormDataBind = bindPattern?.[0] === 'formData' && bindPattern?.[1] === 'onChange';

	const declLines: string[] = [];
	const jsxAttrs: string[] = [];
	let hasSlots = false;
	let hasChildren = false;
	let childrenDslKey = 'items';

	// Determine which props are bind-pattern-consumed (value/onChange/bind)
	const bindConsumedProps = new Set<string>();
	if (isFormDataBind) {
		bindConsumedProps.add('value');
		bindConsumedProps.add('onChange');
		bindConsumedProps.add('bind');
	}

	// Props that are internal to React/HTML and never authored in DSL YAML.
	// 'children' is intentionally NOT here — it falls through to the hasChildren path.
	const SKIP_PROPS = new Set(['className', 'style', 'ref', 'key']);

	for (const prop of allProperties) {
		const name = prop.getName();
		if (bindConsumedProps.has(name)) continue;
		// Skip props that aren't valid camelCase JS identifiers (e.g. aria-pressed, data-*)
		if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(name)) continue;
		// Skip internal React/HTML props never authored in DSL YAML
		if (SKIP_PROPS.has(name)) continue;

		const typeNode = prop.getTypeNode();
		const typeText = typeNode?.getText() ?? '';
		const isReactNode = typeText === 'React.ReactNode' || typeText === 'ReactNode';

		if (isReactNode) {
			hasSlots = true;
			if (name === 'children') {
				hasChildren = true;
				// Check for custom childrenDslKey from JSDoc @slot or conventions
				// Default to 'items' — most components use 'items' as the DSL array key
				childrenDslKey = 'items';
			} else {
				// Named slot: render as children array from node['propName']
				declLines.push(`const ${name} = node['${name}'] as unknown[] | undefined`);
				jsxAttrs.push(`${name}={${name} ? renderChildren(${name}, registry, ctx) : null}`);
			}
		} else {
			// Plain prop - resolve reactive expression then cast
			const propType = `import('${importPath}').${component.name}Props['${name}']`;
			declLines.push(`const ${name} = resolveExpressionValue(node['${name}'], ctx) as ${propType}`);
			jsxAttrs.push(`${name}={${name}}`);
		}
	}

	const attrsText = jsxAttrs.length > 0 ? ' ' + jsxAttrs.join(' ') : '';
	const declText = declLines.map(l => '\t\t' + l).join('\n');

	if (isFormDataBind) {
		// Generate FormContext wrapper for bind-pattern components
		const componentDeclaresBindProp = allProperties.some(p => p.getName() === 'bind');
		const bindAttr = componentDeclaresBindProp ? ' bind={bind}' : '';
		const valueProp = allProperties.find(p => p.getName() === 'value');
		const isArrayValue = valueProp?.getType().isArray() ?? false;
		const valueExpr = isArrayValue
			? `(formData?.[bind] as string[] | undefined) ?? []`
			: `String(formData?.[bind] ?? '')`;

		const outerDecl = `\t\tconst bind = node['bind'] as string`;
		const fullOuterDecl = declText ? `${outerDecl}\n${declText}` : outerDecl;

		return `render: ({ node, ctx }: RegistryRenderProps) => {
${fullOuterDecl}
		function ${component.name}WithContext() {
			const formCtx = useFormContext()
			const formData = formCtx?.formData ?? (ctx['formData'] ?? ctx['row']) as Record<string, unknown> | undefined
			const onChange = formCtx?.onChange ?? ctx['onChange'] as ((key: string, v: unknown) => void) | undefined
			return (
				<${component.name}${bindAttr}${attrsText} value={${valueExpr}} onChange={(v) => onChange?.(bind, v)} />
			)
		}
		return <${component.name}WithContext />
	},`;
	}

	if (hasChildren) {
		const childDeclLine = `\t\tconst ${childrenDslKey} = node['${childrenDslKey}'] as unknown[] | undefined`;
		const fullDecl = declText ? `${childDeclLine}\n${declText}` : childDeclLine;

		return `render: ({ node, registry, ctx }: RegistryRenderProps) => {
${fullDecl}
		return (
			<${component.name}${attrsText}>
				{${childrenDslKey} ? renderChildren(${childrenDslKey}, registry, ctx) : null}
			</${component.name}>
		)
	},`;
	}

	if (declLines.length === 0 && !hasSlots) {
		return `render: () => <${component.name} />,`;
	}

	// All entries with props need ctx for resolveExpressionValue
	const needsRegistry = hasSlots;
	if (needsRegistry) {
		return `render: ({ node, registry, ctx }: RegistryRenderProps) => {
${declText}
		return <${component.name}${attrsText} />
	},`;
	}

	if (declLines.length > 0) {
		return `render: ({ node, ctx }: RegistryRenderProps) => {
${declText}
		return <${component.name}${attrsText} />
	},`;
	}

	return `render: () => <${component.name} />,`;
}

// ─── Import path derivation ────────────────────────────────────────────────────

// Derives a component's relative import path (from the generated entries.tsx location,
// src/generated/) from its discovered absolute source file path.
function relativeImportPath(sourcePath: string, outputDir: string): string {
	const withoutExt = sourcePath.slice(0, -path.extname(sourcePath).length);
	const rel = path.relative(outputDir, withoutExt).split(path.sep).join('/');
	return (rel.startsWith('.') ? rel : './' + rel) + '.js';
}

// ─── YAML $type guard-rail ────────────────────────────────────────────────────

function collectYamlTypeReferences(pagesDir: string): Set<string> {
	const types = new Set<string>();
	if (!fs.existsSync(pagesDir)) return types;
	const re = /\$type:\s*(\S+)/g;
	for (const file of fs.readdirSync(pagesDir).filter(f => f.endsWith('.yaml'))) {
		const content = fs.readFileSync(path.join(pagesDir, file), 'utf-8');
		let match: RegExpExecArray | null;
		while ((match = re.exec(content)) !== null) {
			if (match[1]) types.add(match[1]);
		}
	}
	return types;
}

// ─── Main build function ───────────────────────────────────────────────────────

export interface BuildEntriesOptions {
	/** When true, generated imports use package names (e.g. '@wadeck-app/dsl-renderer')
	 *  instead of monorepo-relative paths. Use when the generator runs as an installed npm package. */
	usePackageImports?: boolean;
}

// Overload for test usage: pass only the override discovered array.
export function buildEntriesFile(overrideDiscovered: DiscoveredComponent[]): string;
// Full signature for production usage.
export function buildEntriesFile(
	appRoot: string,
	watchDirs: Array<{ pkg: string; absDir: string }>,
	overrideDiscovered?: DiscoveredComponent[],
	options?: BuildEntriesOptions
): string;
export function buildEntriesFile(
	appRootOrOverride: string | DiscoveredComponent[],
	watchDirs?: Array<{ pkg: string; absDir: string }>,
	overrideDiscovered?: DiscoveredComponent[],
	options?: BuildEntriesOptions
): string {
	// Handle test-only single-arg form: buildEntriesFile(discoveredArray)
	if (Array.isArray(appRootOrOverride)) {
		return buildEntriesFileImpl('/tmp/test-app', [], appRootOrOverride);
	}
	return buildEntriesFileImpl(appRootOrOverride, watchDirs ?? [], overrideDiscovered, options);
}

function buildEntriesFileImpl(
	appRoot: string,
	watchDirs: Array<{ pkg: string; absDir: string }>,
	overrideDiscovered?: DiscoveredComponent[],
	options?: BuildEntriesOptions
): string {
	const outputDir = path.resolve(appRoot, 'src/generated');
	const allDiscovered = overrideDiscovered ?? (() => {
		const hookWrappers = collectContextHookWrappers(watchDirs.map(d => d.absDir));
		return watchDirs.flatMap(({ absDir }) => discoverComponents(absDir, hookWrappers));
	})();

	// Guard-rail: check all YAML $type references are covered
	const pagesDir = path.resolve(appRoot, 'src/dsl/pages');
	const yamlTypeReferences = collectYamlTypeReferences(pagesDir);
	const registeredNames = new Set(allDiscovered.map(c => c.name));
	const uncoveredComponents = allDiscovered.filter(
		c => yamlTypeReferences.has(c.name) && !registeredNames.has(c.name)
	);
	if (uncoveredComponents.length > 0) {
		throw new Error(
			`[buildEntriesFile] Components referenced by a YAML $type but never wired: ${uncoveredComponents.map(c => c.name).join(', ')}. ` +
				`Add a @registryCategory JSDoc tag to the component.`
		);
	}

	// Collect imports: one import per discovered component (grouped by module)
	const importLines: string[] = [];
	// Always import useFormContext for bind-pattern components
	const hasBindPattern = allDiscovered.some(c => c.bindPattern?.[0] === 'formData');
	const dslUiFormImport = options?.usePackageImports
		? `@wadeck-app/dsl-ui`
		: `../../../dsl-ui/src/components/form/Form.js`;
	if (hasBindPattern) {
		importLines.push(`import { useFormContext } from '${dslUiFormImport}'`);
	}

	for (const component of allDiscovered) {
		const importPath = relativeImportPath(component.sourcePath, outputDir);
		importLines.push(`import { ${component.name} } from '${importPath}'`);
	}

	const dslRendererImport = options?.usePackageImports
		? `@wadeck-app/dsl-renderer`
		: `../../../dsl-renderer/src/engine/DslRenderer.js`;
	const dslRendererTypesImport = options?.usePackageImports
		? `@wadeck-app/dsl-renderer`
		: `../../../dsl-renderer/src/ComponentRegistry.js`;

	const header = `// src/generated/entries.tsx - AUTO-GENERATED by entriesGenerator.ts at build/dev-server start. DO NOT EDIT MANUALLY.
// All changes must be made in: packages/dsl-renderer/src/build/entriesGenerator.ts
import React from 'react'
import { renderChildren, resolveExpressionValue } from '${dslRendererImport}'
import type { ComponentRegistryEntry, RegistryRenderProps } from '${dslRendererTypesImport}'
${importLines.join('\n')}
`;

	// Generate one entry per discovered component
	const entriesBody = allDiscovered.map(component => {
		const importPath = relativeImportPath(component.sourcePath, outputDir);
		const renderBlock = generateSimpleEntry(component, importPath);
		const tagsJson = JSON.stringify(component.tags);

		return `export const ${component.name}Entry: ComponentRegistryEntry = {
	name: '${component.name}', category: '${component.category}', tags: ${tagsJson},
	nodeSchema: null as never,
	${renderBlock}
}`;
	}).join('\n\n');

	// allEntries array
	const allEntriesLines = allDiscovered.map(c => `\t${c.name}Entry,`).join('\n');

	// Metadata (allowedChildren, providesContext, requiresContext)
	const metadataLines = allDiscovered
		.map(c => {
			const entryVar = `${c.name}Entry`;
			const lines: string[] = [];
			if (Object.keys(c.allowedChildren).length > 0) {
				lines.push(`${entryVar}.allowedChildren = ${JSON.stringify(c.allowedChildren)};`);
			}
			if (c.providesContext.length > 0) {
				lines.push(`${entryVar}.providesContext = ${JSON.stringify(c.providesContext)};`);
			}
			if (c.requiresContext.length > 0) {
				lines.push(`${entryVar}.requiresContext = ${JSON.stringify(c.requiresContext)};`);
			}
			return lines.join('\n');
		})
		.filter(Boolean)
		.join('\n');

	const tail = `
// ─── All entries ──────────────────────────────────────────────────────────────

export const allEntries: ComponentRegistryEntry[] = [
${allEntriesLines}
]

// ─── Auto-detected metadata (allowedChildren, providesContext, requiresContext) ─
// Generated from @slot JSDoc tags and createContext/useContext calls in component sources.
${metadataLines}
`;

	return header + '\n' + entriesBody + tail;
}

// ─── Vite plugin ──────────────────────────────────────────────────────────────

export function entriesGenerator(): Plugin {
	let appRoot = '';
	let outputPath = '';
	let watchDirs: Array<{ pkg: string; absDir: string }> = [];
	let buildOptions: BuildEntriesOptions = {};

	// Walk up from this file to find the monorepo root.
	// In the dsl-view source: build/ → src/ → dsl-renderer/ → packages/ → root (4 levels up).
	// When installed as npm package: dist/build/ → dist/ → @wadeck-app/dsl-renderer/ → @wadeck-app/ → node_modules/ → ... (not a monorepo root).
	const monorepoRoot = path.resolve(__dirname, '../../../..');
	// Detect whether we are running inside the dsl-view source tree or as an installed npm package.
	const isInMonorepo = fs.existsSync(path.resolve(monorepoRoot, 'packages/dsl-renderer'));

	function generate() {
		const content = buildEntriesFile(appRoot, watchDirs, undefined, buildOptions);
		fs.mkdirSync(path.dirname(outputPath), { recursive: true });
		fs.writeFileSync(outputPath, content, 'utf-8');
	}

	return {
		name: 'entries-generator',
		configResolved(config) {
			appRoot = config.root;
			outputPath = path.resolve(appRoot, 'src/generated/entries.tsx');
			const dslConfig = readDslConfig(appRoot);
			buildOptions = { usePackageImports: !isInMonorepo };
			watchDirs = resolveWatchDirs(dslConfig, monorepoRoot, appRoot);
		},
		buildStart() {
			generate();
		},
		handleHotUpdate({ file }) {
			const isWatched = watchDirs.some(({ absDir }) => file.startsWith(absDir));
			if (isWatched) {
				generate();
			}
		},
	};
}
