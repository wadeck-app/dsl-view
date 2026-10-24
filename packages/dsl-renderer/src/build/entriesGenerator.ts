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
 * - Props classified as: ReactNode slot -> renderChildren, @registryBind -> FormContext,
 *   (node, ctx) => ReactNode callback -> re-enter the DSL renderer per call (e.g. DataTable's
 *   `renderNode`, for expansion rows), everything else -> node['propName'] as PropType (direct cast)
 */

import fs from 'fs';
import path from 'path';
import { Node, Project, SyntaxKind } from 'ts-morph';
import type { FunctionDeclaration, PropertySignature, Type } from 'ts-morph';
import { fileURLToPath } from 'url';
import type { Plugin } from 'vite';
import { readDslConfig } from './dslConfig.js';
import type { DslConfig } from './dslConfig.js';
import { isPathInside } from './pathUtils.js';
import { buildKnownKeysManifest } from './unknownKeys.js';
import type { DslKeysManifest } from './unknownKeys.js';
import type { PropKind } from '../engine/coerceProp.js';
import { EXTENSION_SLOT_TYPE } from '../dslKeys.js';
import type { ItemKeysSpec, MapSlotSpec } from '../dslKeys.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Package directory resolution ─────────────────────────────────────────────

/** Find the node_modules directory that actually contains the given package. */
export function findNodeModulesForPackage(startDir: string, pkgName: string): string | null {
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
export function resolvePackageComponentsDir(
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

export function resolveWatchDirs(
	config: DslConfig,
	monorepoRoot: string,
	appRoot: string
): Array<{ pkg: string; absDir: string }> {
	const dirs: Array<{ pkg: string; absDir: string }> = [
		{ pkg: 'dsl-ui', absDir: resolvePackageComponentsDir('dsl-ui', monorepoRoot, appRoot) },
	];
	for (const pkg of Object.values(config.packages ?? {})) {
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

// Props that are internal to React/HTML and never authored in DSL YAML.
// 'children' is intentionally NOT here — it falls through to the hasChildren path.
const GENERATED_RENDER_SKIP_PROPS = new Set(['className', 'style', 'ref', 'key']);

// JavaScript words that cannot name a variable: a prop called `default` (PageSizeSelect) must not generate `const default = ...`.
const RESERVED_WORDS = new Set([
	'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends',
	'false', 'finally', 'for', 'function', 'if', 'implements', 'import', 'in', 'instanceof', 'interface', 'let', 'new', 'null', 'package',
	'private', 'protected', 'public', 'return', 'static', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while',
	'with', 'yield',
]);

/** The variable that holds a prop's value in the generated render: camelCase for hyphenated names, suffixed for reserved words. */
function propVariableName(name: string): string {
	const camel = name.includes('-') ? name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()) : name;
	return RESERVED_WORDS.has(camel) ? `${camel}Prop` : camel;
}

// ts-morph returns quoted names for hyphenated props (e.g. "'aria-label'" instead of "aria-label").
function unquotePropName(name: string): string {
	return name.replace(/^['"`]|['"`]$/g, '');
}

/**
 * Whether the generated render reads this prop from the YAML node at all. The single filter behind both
 * `extractKnownKeys` (what the compiler accepts) and `generateSimpleEntry` (what the render reads): they must never disagree.
 * Only identifiers are authored (data-*, other hyphenated and underscored names never are); aria-* is valid JSX and therefore authorable.
 */
function isAuthorablePropName(name: string): boolean {
	if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(name) && !name.startsWith('aria-')) return false;
	return !GENERATED_RENDER_SKIP_PROPS.has(name);
}

// A callback shaped (node, ctx) => ReactNode - the generic "recurse back into the DSL renderer for this one sub-node"
// slot, e.g. DataTable's `renderNode` (expansion rows, one per clicked row). Unlike a plain React.ReactNode slot it needs
// extra per-call ctx (e.g. { row }) merged in by the caller, so it can't be resolved once up front like other props:
// the component itself calls it, passing its own extra ctx each time.
function isRenderNodeCallbackType(typeText: string): boolean {
	return typeText.includes('=>') && /=>\s*(React\.)?ReactNode\s*$/.test(typeText);
}

// Members of a union type text, split on top-level `|` only so a function type's own parameters do not interfere.
function splitTopLevelUnion(typeText: string): string[] {
	const members: string[] = [];
	let depth = 0;
	let current = '';
	for (const ch of typeText) {
		if ('([{<'.includes(ch)) depth++;
		else if (')]}>'.includes(ch) && !(ch === '>' && current.endsWith('='))) depth--;
		if (ch === '|' && depth === 0) {
			members.push(current.trim());
			current = '';
		} else {
			current += ch;
		}
	}
	members.push(current.trim());
	return members;
}

export interface PropCoercion {
	kind: PropKind;
	/** A list the component reads without checking (`options.map(...)`): a missing one becomes `[]`. */
	required: boolean;
	/** The type accepts `null` (`string | null`): a received null is kept instead of being treated as absent. */
	nullable: boolean;
}

/** The trailing arguments of the generated `coerceProp(value, where, ...)` call. */
function coerceArgs(coercion: PropCoercion): string {
	return `'${coercion.kind}', ${coercion.required}${coercion.nullable ? ', true' : ''}`;
}

function isListType(type: Type): boolean {
	return type.isArray() || type.getSymbol()?.getName() === 'ReadonlyArray';
}

// Objects a YAML map can stand for: records and interfaces of fields. Built-ins with their own behaviour (a Date, a Map...),
// lists, callables and constructors are not.
const BUILTIN_OBJECT_TYPES = new Set(['Date', 'RegExp', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Promise', 'Error', 'Function', 'Array', 'ReadonlyArray']);
function isPlainObjectType(type: Type): boolean {
	if (!type.isObject() || isListType(type) || type.getCallSignatures().length > 0 || type.getConstructSignatures().length > 0) return false;
	const name = type.getSymbol()?.getName();
	return name === undefined || !BUILTIN_OBJECT_TYPES.has(name);
}

function isPrimitiveType(type: Type): boolean {
	return type.isString() || type.isNumber() || type.isBoolean() || type.isStringLiteral() || type.isNumberLiteral() || type.isBooleanLiteral();
}

/**
 * What the generated render must enforce on the YAML value of a plain prop, from the component's TypeScript type:
 * a string / number / boolean prop never receives a map, a list prop never receives a non-list, a callback prop never
 * receives data. `null` when the type says nothing checkable (objects, `unknown`, dates, unresolved imports, mixed
 * unions): those props are passed through exactly as before. See `coerceProp` in the renderer for what is done.
 */
export function classifyPropCoercion(prop: PropertySignature): PropCoercion | null {
	const type = prop.getType();
	const members = type.isUnion() ? type.getUnionTypes() : [type];
	const defined = members.filter(member => !member.isUndefined() && !member.isNull());
	if (defined.length === 0) return null;
	// The shared Project is not strict, so the checker erases `null` and `undefined` from unions: read them from the
	// declared type text instead.
	const declared = splitTopLevelUnion(prop.getTypeNode()?.getText() ?? '');
	const required = !prop.hasQuestionToken() && !declared.includes('undefined');
	const nullable = declared.includes('null');
	// A plain `string` is read with string methods (`href.startsWith`, `path.replace`): a number from JSON is converted,
	// not rejected. A union of literals or mixed primitives stays 'primitive' (no conversion).
	if (defined.every(member => member.isString())) return { kind: 'string', required, nullable };
	if (defined.every(isPrimitiveType)) return { kind: 'primitive', required, nullable };
	if (defined.every(isListType)) return { kind: 'array', required, nullable };
	if (defined.every(member => member.getCallSignatures().length > 0)) return { kind: 'function', required, nullable };
	if (defined.every(isPlainObjectType)) return { kind: 'object', required, nullable };
	return null;
}

/**
 * A prop that holds nested DSL nodes: `React.ReactNode`, or a union of `ReactNode` and render functions
 * (e.g. FieldWrapper's `ReactNode | ((control) => ReactNode)`). YAML cannot author a function, so for the DSL the prop
 * is a plain node slot. Members are split on top-level `|` only, so a function type's own parameters do not interfere.
 */
export function isReactNodeSlotType(typeText: string): boolean {
	const members = splitTopLevelUnion(typeText);
	const isNode = (member: string) => member === 'React.ReactNode' || member === 'ReactNode';
	// A member wrapped in parentheses is a function type: `((control: X) => ReactNode)`.
	const isRenderFunction = (member: string) => /^\(.*=>.*\)$/.test(member) || /^\(.*\)\s*=>/.test(member);
	return members.some(isNode) && members.every(member => isNode(member) || isRenderFunction(member) || member === 'undefined' || member === 'null');
}

/**
 * For a prop typed as an array of a plain interface declared in the same file (`Step[]`, `Array<Step>`), the names of
 * that interface's properties that hold DSL nodes (`items: React.ReactNode`). Such a prop is authored as a YAML list of
 * objects whose node fields are lists of DSL nodes; passed through untouched they reach React as raw objects
 * ("Objects are not valid as a React child"), so the generated render must turn those fields into elements.
 */
export function extractNodeFieldsOfItems(
	sourceFile: ReturnType<InstanceType<typeof Project>['addSourceFileAtPath']>,
	typeText: string
): string[] {
	const match = /^(\w+)\[\]$/.exec(typeText.trim()) ?? /^Array<\s*(\w+)\s*>$/.exec(typeText.trim());
	const itemInterface = match?.[1] ? sourceFile.getInterface(match[1]) : undefined;
	if (!itemInterface) return [];
	return itemInterface
		.getProperties()
		.filter((p) => isReactNodeSlotType(p.getTypeNode()?.getText() ?? ''))
		.map((p) => unquotePropName(p.getName()));
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
						// A ReactNode `children` prop is read from the `items` DSL key by the generated
						// render (see generateSimpleEntry), so metadata must be keyed by `items`.
						const propName = prop.getName();
						const typeText = prop.getTypeNode()?.getText() ?? '';
						const dslKey = propName === 'children' && isReactNodeSlotType(typeText) ? 'items' : propName;
						result[dslKey] = tags;
					}
				}
			}
		}
	}
	return result;
}

// Props documented with `@mapSlot <nodeKey>` hold a map of named entries, each carrying one nested DSL node under
// `<nodeKey>` (e.g. `/** @mapSlot view */ variants: Record<string, AbVariantSpec>`). The entry's allowed keys are the
// properties of the interface named as the Record's value type, declared in the same file. Fails loudly (build error)
// when the shape cannot be derived: a map slot the walker silently skips would leave nested views unchecked.
export function extractMapSlots(
	sourceFile: ReturnType<InstanceType<typeof Project>['addSourceFileAtPath']>,
	componentName: string
): Record<string, MapSlotSpec> {
	const propsInterface = sourceFile.getInterface(componentName + 'Props');
	if (!propsInterface) return {};

	const result: Record<string, MapSlotSpec> = {};
	for (const prop of propsInterface.getProperties()) {
		for (const doc of prop.getJsDocs()) {
			for (const tag of doc.getTags()) {
				if (tag.getTagName() !== 'mapSlot') continue;
				const where = `${componentName}Props.${prop.getName()}`;
				const nodeKey = tag.getCommentText()?.trim() ?? '';
				if (!nodeKey) {
					throw new Error(`[entriesGenerator] ${where}: @mapSlot needs the key holding the nested node, e.g. "@mapSlot view"`);
				}
				const typeText = prop.getTypeNode()?.getText() ?? '';
				const match = /^Record<\s*string\s*,\s*(\w+)\s*>$/.exec(typeText);
				const entryInterface = match?.[1] ? sourceFile.getInterface(match[1]) : undefined;
				if (!entryInterface) {
					throw new Error(
						`[entriesGenerator] ${where}: @mapSlot needs the type "Record<string, SomeInterface>" with SomeInterface declared in the same file, got "${typeText}"`
					);
				}
				const keys = entryInterface.getProperties().map((p) => unquotePropName(p.getName()));
				if (!keys.includes(nodeKey)) {
					throw new Error(`[entriesGenerator] ${where}: @mapSlot key "${nodeKey}" is not a property of ${entryInterface.getName()} (${keys.join(', ')})`);
				}
				result[prop.getName()] = { keys, nodeKey };
			}
		}
	}
	return result;
}

type TsSourceFile = ReturnType<InstanceType<typeof Project>['addSourceFileAtPath']>;

function propertyNames(iface: { getProperties(): Array<{ getName(): string }> }): string[] {
	return iface.getProperties().map((p) => unquotePropName(p.getName()));
}

// Keys of one YAML object interface, plus the keys of its own array-of-interface properties (e.g. an actions
// column's `items: ActionItemSpec[]`). `visited` guards against self-referencing interfaces.
function itemSpecOf(sourceFile: TsSourceFile, interfaceName: string, where: string, visited: Set<string>): ItemKeysSpec {
	const iface = sourceFile.getInterface(interfaceName);
	if (!iface) {
		throw new Error(`[entriesGenerator] ${where}: @itemKeys names "${interfaceName}", which is not an interface declared in the same file`);
	}
	if (visited.has(interfaceName)) {
		throw new Error(`[entriesGenerator] ${where}: @itemKeys interface "${interfaceName}" references itself`);
	}
	const nextVisited = new Set(visited).add(interfaceName);
	const arrays: Record<string, ItemKeysSpec> = {};
	for (const prop of iface.getProperties()) {
		const typeText = prop.getTypeNode()?.getText() ?? '';
		const match = /^(\w+)\[\]$/.exec(typeText) ?? /^Array<\s*(\w+)\s*>$/.exec(typeText);
		if (match?.[1] && sourceFile.getInterface(match[1])) {
			arrays[unquotePropName(prop.getName())] = itemSpecOf(sourceFile, match[1], where, nextVisited);
		}
	}
	return { keys: propertyNames(iface), ...(Object.keys(arrays).length > 0 ? { arrays } : {}) };
}

// Props documented with `@itemKeys A, B` hold an array of plain objects authored in YAML (e.g. DataTable `columns`).
// Each named interface (same file) lists the keys one kind of item may carry. An interface whose `type` property is a
// string literal (`type: 'actions'`) describes the items with that `type`; exactly one interface must have no such
// literal and describes all other items. Array-of-interface properties are followed (an actions column's `items`).
// Fails loudly (build error) when the shape cannot be derived: a silently unchecked prop would leave typos unflagged.
export function extractItemKeys(sourceFile: TsSourceFile, componentName: string): Record<string, ItemKeysSpec> {
	const propsInterface = sourceFile.getInterface(componentName + 'Props');
	if (!propsInterface) return {};

	const result: Record<string, ItemKeysSpec> = {};
	for (const prop of propsInterface.getProperties()) {
		for (const doc of prop.getJsDocs()) {
			for (const tag of doc.getTags()) {
				if (tag.getTagName() !== 'itemKeys') continue;
				const where = `${componentName}Props.${prop.getName()}`;
				const names = (tag.getCommentText() ?? '').split(',').map((n) => n.trim()).filter(Boolean);
				if (names.length === 0) {
					throw new Error(`[entriesGenerator] ${where}: @itemKeys needs interface names, e.g. "@itemKeys ColumnSpec, ActionsColumnSpec"`);
				}
				let base: ItemKeysSpec | undefined;
				const byType: Record<string, ItemKeysSpec> = {};
				for (const name of names) {
					const spec = itemSpecOf(sourceFile, name, where, new Set());
					const typeProp = sourceFile.getInterface(name)!.getProperty('type');
					const literal = /^['"](.+)['"]$/.exec(typeProp?.getTypeNode()?.getText() ?? '')?.[1];
					if (literal) {
						byType[literal] = spec;
					} else if (base) {
						throw new Error(`[entriesGenerator] ${where}: @itemKeys has two interfaces without a literal \`type\` ("${name}" and another); only one may describe the default item`);
					} else {
						base = spec;
					}
				}
				if (!base) {
					throw new Error(`[entriesGenerator] ${where}: @itemKeys needs one interface without a literal \`type\` for the default item`);
				}
				result[prop.getName()] = { ...base, ...(Object.keys(byType).length > 0 ? { byType } : {}) };
			}
		}
	}
	return result;
}

// Non-directive DSL keys the generated render reads for this component. MUST mirror the prop
// filtering in generateSimpleEntry (a consistency test compares both against the generated render).
export function extractKnownKeys(
	sourceFile: ReturnType<InstanceType<typeof Project>['addSourceFileAtPath']>,
	componentName: string,
	bindPattern: string[] | null
): string[] {
	const propsInterface = sourceFile.getInterface(componentName + 'Props');
	// No Props interface: the fallback render only forwards `items`.
	if (!propsInterface) return ['items'];

	const properties = propsInterface.getProperties();
	const isFormDataBind = bindPattern?.[0] === 'formData' && bindPattern?.[1] === 'onChange';
	const hasCheckedProp = properties.some(p => p.getName() === 'checked');
	const hasValueProp = properties.some(p => p.getName() === 'value');
	const consumed = new Set<string>();
	if (isFormDataBind) {
		consumed.add('value');
		consumed.add('onChange');
		consumed.add('bind');
		if (hasCheckedProp && !hasValueProp) consumed.add('checked');
	}

	const keys = new Set<string>();
	if (isFormDataBind) keys.add('bind');
	for (const prop of properties) {
		const name = unquotePropName(prop.getName());
		if (consumed.has(name)) continue;
		if (!isAuthorablePropName(name)) continue;
		const typeText = prop.getTypeNode()?.getText() ?? '';
		const isReactNode = isReactNodeSlotType(typeText);
		// A (node, ctx) => ReactNode callback is wired by the generated render, never read from the YAML node.
		if (!isReactNode && isRenderNodeCallbackType(typeText)) continue;
		// A ReactNode `children` prop is read from the `items` DSL key (see generateSimpleEntry).
		keys.add(name === 'children' && isReactNode ? 'items' : name);
	}
	return [...keys].sort();
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

// Tests, stories and specs are never components or hooks of the library: skipping them keeps a test helper from being
// registered and spares ts-morph from parsing a large share of the files of a component tree.
function isComponentSourceFile(file: string): boolean {
	return file.endsWith('.tsx') && !/\.(test|spec|stories)\.tsx$/.test(file);
}

function collectContextHookWrappers(pkgDirs: string[]): Map<string, string[]> {
	const wrapperToContexts = new Map<string, string[]>();
	const project = new Project({ skipFileDependencyResolution: true });
	for (const dir of pkgDirs) {
		if (!fs.existsSync(dir)) continue;
		for (const file of (fs.readdirSync(dir, { recursive: true }) as string[]).filter(isComponentSourceFile)) {
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
	/** @registryLazy JSDoc tag present: component is React.lazy()-wrapped instead of statically imported. */
	lazy: boolean;
	allowedChildren: Record<string, string[]>;
	/** Optional so hand-built test fixtures can omit it; discoverComponents always sets it. */
	knownKeys?: string[];
	/** Optional like knownKeys; see extractMapSlots. */
	mapSlots?: Record<string, MapSlotSpec>;
	/** Optional like knownKeys; see extractItemKeys. */
	itemKeys?: Record<string, ItemKeysSpec>;
	providesContext: string[];
	requiresContext: string[];
	sourcePath: string;
}

function discoverComponents(srcDir: string, hookWrappers: Map<string, string[]>): DiscoveredComponent[] {
	if (!fs.existsSync(srcDir)) return [];

	const project = new Project({ skipFileDependencyResolution: true });
	const discovered: DiscoveredComponent[] = [];

	for (const file of (fs.readdirSync(srcDir, { recursive: true }) as string[]).filter(isComponentSourceFile)) {
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
			let lazy = false;

			for (const tag of jsDoc.getTags()) {
				const tagName = tag.getTagName();
				const text = tag.getCommentText()?.trim() ?? '';
				if (tagName === 'registryCategory') category = text;
				else if (tagName === 'registryTags') tags = text.split(/\s+/).filter(Boolean);
				else if (tagName === 'registryBind') bindPattern = text.split(/\s+/).filter(Boolean);
				else if (tagName === 'registryLazy') lazy = true;
			}

			if (category) {
				const allowedChildren = extractAllowedChildren(sourceFile, name);
				const knownKeys = extractKnownKeys(sourceFile, name, bindPattern);
				const mapSlots = extractMapSlots(sourceFile, name);
				const itemKeys = extractItemKeys(sourceFile, name);
				const providesContext = [...new Set([
					...extractContextNames(fn.getText(), 'createContext'),
					...extractProvidesContextFromProviderJsx(fn),
				])];
				const requiresContext = extractRequiresContext(fn, hookWrappers);
				discovered.push({ name, category, tags, bindPattern, lazy, allowedChildren, knownKeys, mapSlots, itemKeys, providesContext, requiresContext, sourcePath: absPath });
			}
		}
	}

	return discovered;
}

// ─── Simple render block generation ───────────────────────────────────────────
//
// The new generic model: every prop is one of:
//   - React.ReactNode (slot) -> renderChildren(node['propName'], registry, ctx)
//   - (node, ctx) => ReactNode callback -> a closure that re-enters renderChildren per call,
//     merging the caller's own extra ctx (e.g. DataTable passing { row } for an expansion)
//   - Everything else -> node['propName'] as import('...').ComponentNameProps['propName']
//
// Special case: @registryBind formData onChange -> wrap with FormContext.
// No urlBackedPairs, no ctxSourceProp, no ctxFixedKeyProps. YAML declares all wiring.

// `moduleLevel` receives code that must live at module scope of the generated file (e.g. the stable
// wrapper component of a bind-pattern entry): a component declared inside `render` gets a new identity on
// every render, so React would unmount and remount the field (focus lost, refs stale) each time.
// `project` is shared by every component of one generation: building a ts-morph Project (and its type checker, needed
// for the bound value types) per component made a registry of ~90 components take tens of seconds.
function generateSimpleEntry(
	component: DiscoveredComponent,
	importPath: string,
	moduleLevel: string[],
	project: Project
): string {
	const sourceFile = project.getSourceFile(component.sourcePath) ?? project.addSourceFileAtPath(component.sourcePath);
	const propsInterface = sourceFile.getInterface(`${component.name}Props`);

	if (!propsInterface) {
		// No Props interface found — check if the component accepts children via HTML attributes
		// (e.g. RouterProvider from react-router-dom which wraps HTMLElement).
		// Generate a children-forwarding render to avoid broken JSX with required children.
		return `render: ({ node, registry, ctx }: RegistryRenderProps) => {
		const items = node['items'] as unknown[] | undefined
		return <${component.name}>{items ? renderChildren(items, registry, ctx) : null}</${component.name}>
	},`;
	}

	const allProperties = propsInterface.getProperties();
	const bindPattern = component.bindPattern;
	// Only support the formData/onChange bind pattern (the one special case worth keeping)
	const isFormDataBind = bindPattern?.[0] === 'formData' && bindPattern?.[1] === 'onChange';

	// Detect type parameters on the Props interface (e.g. DataTableProps<T extends Record<string,unknown>>).
	// Use Record<string, unknown> as the safest universal satisfier for constrained generics.
	const typeParams = propsInterface.getTypeParameters();
	const typeArgs = typeParams.length > 0
		? '<' + typeParams.map(() => 'Record<string, unknown>').join(', ') + '>'
		: '';

	const declLines: string[] = [];
	const jsxAttrs: string[] = [];
	// True when any generated line calls renderChildren(..., registry, ...), so `registry` must be destructured.
	let usesRegistry = false;
	let hasChildren = false;

	// Pre-scan: determine if this is a checked-style (toggle) component for bind exclusion
	const hasCheckedProp = allProperties.some(p => p.getName() === 'checked');
	const hasValueProp   = allProperties.some(p => p.getName() === 'value');

	// Determine which props are bind-pattern-consumed (value/onChange/bind)
	const bindConsumedProps = new Set<string>();
	if (isFormDataBind) {
		bindConsumedProps.add('value');
		bindConsumedProps.add('onChange');
		bindConsumedProps.add('bind');
		// Toggle components (checked but no value) — exclude checked from normal prop loop
		if (hasCheckedProp && !hasValueProp) bindConsumedProps.add('checked');
	}

	for (const prop of allProperties) {
		const name = unquotePropName(prop.getName());
		if (bindConsumedProps.has(name)) continue;
		// data-*, non-identifier and internal React/HTML props are never authored in DSL YAML.
		if (!isAuthorablePropName(name)) continue;

		const typeText = prop.getTypeNode()?.getText() ?? '';
		const isReactNode = isReactNodeSlotType(typeText);
		const isRenderNodeCallback = isRenderNodeCallbackType(typeText);

		if (isReactNode) {
			usesRegistry = true;
			if (name === 'children') {
				// A ReactNode `children` prop is read from the `items` DSL key (see extractAllowedChildren / extractKnownKeys).
				hasChildren = true;
			} else {
				// Named slot: render as children array from node['propName']
				const slotVar = propVariableName(name);
				declLines.push(`const ${slotVar} = node['${name}'] as unknown[] | undefined`);
				jsxAttrs.push(`${name}={${slotVar} ? renderChildren(${slotVar}, registry, ctx) : null}`);
			}
		} else if (isRenderNodeCallback) {
			usesRegistry = true;
			const varName = propVariableName(name);
			declLines.push(
				`const ${varName} = (n: unknown, extraCtx: Record<string, unknown>) => renderChildren([n], registry, { ...ctx, ...extraCtx })[0] ?? null`
			);
			jsxAttrs.push(`${name}={${varName}}`);
		} else if (extractNodeFieldsOfItems(sourceFile, typeText).length > 0) {
			// An array of objects some of whose fields hold DSL nodes (Stepper `steps[].items`): resolve the list, then
			// render each node field of each entry, leaving entries and fields that are not lists for the component to judge.
			usesRegistry = true;
			const nodeFields = extractNodeFieldsOfItems(sourceFile, typeText);
			const propType = `import('${importPath}').${component.name}Props${typeArgs}['${name}']`;
			const renderedFields = nodeFields
				.map(field => `${field}: Array.isArray(e['${field}']) ? renderChildren(e['${field}'] as unknown[], registry, ctx) : e['${field}']`)
				.join(', ');
			// The list itself is checked like any other list prop (a missing required one becomes [], a non-list is ignored).
			const listVar = propVariableName(name);
			const listCoercion = classifyPropCoercion(prop);
			const rawValue = `resolveExpressionValue(node['${name}'], ctx)`;
			declLines.push(
				listCoercion?.kind === 'array'
					? `const ${listVar}Raw = coerceProp(${rawValue}, '${component.name}.${name}', ${coerceArgs(listCoercion)})`
					: `const ${listVar}Raw = ${rawValue}`
			);
			declLines.push(
				`const ${listVar} = (Array.isArray(${listVar}Raw) ? ${listVar}Raw.map((entry: unknown) => { if (entry === null || typeof entry !== 'object') return entry; const e = entry as Record<string, unknown>; return { ...e, ${renderedFields} } }) : ${listVar}Raw) as ${propType}`
			);
			jsxAttrs.push(`${name}={${listVar}}`);
		} else {
			// Plain prop - resolve reactive expression then cast.
			// For hyphenated names (e.g. aria-label), use a camelCase JS variable.
			const varName = propVariableName(name);
			const propType = `import('${importPath}').${component.name}Props${typeArgs}['${name}']`;
			// @ctxDefault: when the YAML does not set this prop, fall back to the same-named ctx entry
			// (e.g. DataTable.onAction -> ctx.onAction built by GenericPageRunner from $actions), so a
			// handler the page already declares does not need an `onAction: $onAction` line per node.
			// `@ctxDefault $initialLoading` names a differently-spelled ctx entry (the first word of the tag text).
			const ctxDefaultTag = prop.getJsDocs().flatMap(doc => doc.getTags()).find(tag => tag.getTagName() === 'ctxDefault');
			const ctxDefaultKey = ctxDefaultTag ? (ctxDefaultTag.getCommentText()?.trim().split(/\s+/)[0] || name) : undefined;
			const ctxFallback = ctxDefaultKey ? ` ?? ctx['${ctxDefaultKey}']` : '';
			const resolved = `resolveExpressionValue(node['${name}'], ctx)${ctxFallback}`;
			// A wrong-shaped value (a map for a string, no list for a list) is ignored with one named warning instead of
			// crashing the page inside the component.
			const coercion = classifyPropCoercion(prop);
			const value = coercion
				? `coerceProp(${resolved}, '${component.name}.${name}', ${coerceArgs(coercion)})`
				: `(${resolved})`;
			declLines.push(`const ${varName} = ${value} as ${propType}`);
			jsxAttrs.push(`${name}={${varName}}`);
		}
	}

	const attrsText = jsxAttrs.length > 0 ? ' ' + jsxAttrs.join(' ') : '';
	const declText = declLines.map(l => '\t\t' + l).join('\n');

	if (isFormDataBind) {
		// Generate FormContext wrapper for bind-pattern components
		const componentDeclaresBindProp = allProperties.some(p => p.getName() === 'bind');
		const bindAttr = componentDeclaresBindProp ? ' bind={bind}' : '';
		const valueProp       = allProperties.find(p => p.getName() === 'value');
		const isToggle        = hasCheckedProp && !hasValueProp;
		const isArrayValue    = valueProp?.getType().isArray() ?? false;
		const isNumberValue   = valueProp?.getType().isNumber() ?? false;
		const valueTypeText   = valueProp?.getTypeNode()?.getText() ?? '';
		const isDateValue     = valueTypeText === 'Date' || valueTypeText === 'Date | null' || valueTypeText === 'null | Date';
		// DateRange = { from: Date | null; to: Date | null } — match any variant of the type name
		const isDateRangeValue = valueTypeText === 'DateRange' || valueTypeText === 'DateRange | null' || valueTypeText === 'null | DateRange';
		// Use 'checked' (boolean) for toggle components (e.g. Switch), 'value' otherwise.
		const boundAttr = isToggle ? 'checked' : 'value';
		const valueExpr = isToggle
			? `Boolean(formData?.[bind])`
			: isDateRangeValue
				? `(formData?.[bind] as { from: Date | null; to: Date | null } | undefined) ?? { from: new Date(), to: null }`
				: isDateValue
					? `coerceDate(formData?.[bind], '${component.name}.value')`
					: isNumberValue
						? `Number(formData?.[bind] ?? 0)`
						: isArrayValue
							? `coerceStringList(formData?.[bind], '${component.name}.value')`
							: `String(formData?.[bind] ?? '')`;

		const destructured = `{ node, ${usesRegistry ? 'registry, ' : ''}ctx }`;
		const bindDecl = `\t\tconst bind = node['bind'] as string`;
		const fullDecl = declText ? `${bindDecl}\n${declText}` : bindDecl;

		moduleLevel.push(`function ${component.name}WithContext(${destructured}: RegistryRenderProps) {
${fullDecl}
		const formCtx = useFormContext()
		const formData = formCtx?.formData ?? (ctx['formData'] ?? ctx['row']) as Record<string, unknown> | undefined
		const onChange = formCtx?.onChange ?? ctx['onChange'] as ((key: string, v: unknown) => void) | undefined
		return (
			<${component.name}${bindAttr}${attrsText} ${boundAttr}={${valueExpr}} onChange={(v) => onChange?.(bind, v)} />
		)
}`);

		return `render: (props: RegistryRenderProps) => <${component.name}WithContext {...props} />,`;
	}

	if (hasChildren) {
		const childDeclLine = "\t\tconst items = node['items'] as unknown[] | undefined";
		const fullDecl = declText ? `${childDeclLine}\n${declText}` : childDeclLine;

		return `render: ({ node, registry, ctx }: RegistryRenderProps) => {
${fullDecl}
		return (
			<${component.name}${attrsText}>
				{items ? renderChildren(items, registry, ctx) : null}
			</${component.name}>
		)
	},`;
	}

	if (declLines.length === 0 && !usesRegistry) {
		return `render: () => <${component.name} />,`;
	}

	// All entries with props need ctx for resolveExpressionValue; registry only when a line uses it
	// (named slot or render-node callback), otherwise it would be an unused destructured variable.
	if (usesRegistry) {
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

// Derives a component's import specifier from its discovered absolute source path.
// When the source is inside node_modules/@wadeck-app/<pkg>/src/..., use the package
// name import rather than a long relative ../../../../node_modules/... path.
export function relativeImportPath(sourcePath: string, outputDir: string): string {
	// Normalize separators for cross-platform matching
	const normalised = sourcePath.split(path.sep).join('/');
	const nmMatch = normalised.match(/\/node_modules\/(@[^/]+\/[^/]+|[^/]+)\/(.+)$/);
	if (nmMatch) {
		const pkgName = nmMatch[1]!;        // e.g. "@wadeck-app/dsl-ui"
		const inPkg   = nmMatch[2]!;        // e.g. "src/components/layout/PageContent.tsx"
		// Use dist/ path so consumers import the compiled output, not raw source.
		// Raw source imports force Rollup to traverse devDeps (e.g. @radix-ui/*) not installed in the consuming project.
		const distPkg = inPkg.startsWith('src/') ? 'dist/' + inPkg.slice('src/'.length) : inPkg;
		const withoutExt = distPkg.slice(0, -path.extname(distPkg).length);
		return `${pkgName}/${withoutExt}.js`;
	}
	const withoutExt = sourcePath.slice(0, -path.extname(sourcePath).length);
	const rel = path.relative(outputDir, withoutExt).split(path.sep).join('/');
	return (rel.startsWith('.') ? rel : './' + rel) + '.js';
}

/**
 * The `schemas/generated-node-schemas.ts` module of the library a component belongs to, if it ships one (the library root
 * is the nearest ancestor directory holding it, never searched beyond the package's own package.json). Its
 * `<Name>NodeSchema` exports let DslRenderer warn about a prop value of the wrong shape (see warnInvalidNodeProps).
 */
export function findNodeSchemaModule(sourcePath: string): string | null {
	let dir = path.dirname(sourcePath);
	for (;;) {
		const candidate = path.join(dir, 'schemas', 'generated-node-schemas.ts');
		if (fs.existsSync(candidate)) {
			return candidate;
		}
		const parent = path.dirname(dir);
		if (parent === dir || fs.existsSync(path.join(dir, 'package.json'))) {
			return null;
		}
		dir = parent;
	}
}

// ─── YAML $type guard-rail ────────────────────────────────────────────────────

// Component names written as `$type: Name` (optionally quoted) in the pages, several per line allowed (flow style).
// A comment (`#` at the start of a line or after a space) is ignored; an expression value (`$type: $ctx.kind`) is not a name.
export function collectYamlTypeReferences(pagesDir: string): Set<string> {
	const types = new Set<string>();
	if (!fs.existsSync(pagesDir)) return types;
	for (const file of fs.readdirSync(pagesDir).filter(f => f.endsWith('.yaml')).sort()) {
		for (const line of fs.readFileSync(path.join(pagesDir, file), 'utf-8').split(/\r?\n/)) {
			const code = line.replace(/(^|\s)#.*$/, '$1');
			for (const match of code.matchAll(/\$type:\s*['"]?([A-Za-z_][\w:.-]*)/g)) {
				types.add(match[1]!);
			}
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

/**
 * Key metadata (knownKeys, allowedChildren) of every `@registryCategory` component found under `componentDirs`,
 * as a serializable manifest. Same discovery as the generated registry, so a CLI validating author views
 * against this JSON sees exactly what the renderer reads. See findUnknownKeys in ./unknownKeys.
 */
export function generateKnownKeysManifest(componentDirs: string[]): DslKeysManifest {
	const hookWrappers = collectContextHookWrappers(componentDirs);
	return buildKnownKeysManifest(componentDirs.flatMap((dir) => discoverComponents(dir, hookWrappers)));
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
		// A configured package whose components directory cannot be found contributes nothing: say so instead of letting
		// every page that uses its components fail later with "Unknown component type".
		for (const { pkg, absDir } of watchDirs) {
			if (!fs.existsSync(absDir)) {
				console.warn(
					`[entriesGenerator] components directory not found for package "${pkg}": ${absDir}. ` +
						`Its components will be missing from the registry - check the package name in dsl.config.yaml and that it is installed.`
				);
			}
		}
		const hookWrappers = collectContextHookWrappers(watchDirs.map(d => d.absDir));
		return watchDirs.flatMap(({ absDir }) => discoverComponents(absDir, hookWrappers));
	})();

	// Guard-rail: a page $type that no scanned component provides renders "Unknown component type" at runtime (a component
	// missing its @registryCategory tag is silently left out of the registry). Only a warning: an app-local component
	// registered by hand, the built-in ExtensionSlot and `<module>:<Name>` library components are legitimate and unknowable here.
	const pagesDir = path.resolve(appRoot, 'src/dsl/pages');
	const registeredNames = new Set(allDiscovered.map(c => c.name));
	const unresolvedTypes = [...collectYamlTypeReferences(pagesDir)].filter(
		type => !registeredNames.has(type) && type !== EXTENSION_SLOT_TYPE && !type.includes(':')
	);
	if (unresolvedTypes.length > 0) {
		console.warn(
			`[entriesGenerator] src/dsl/pages uses $type(s) that no scanned component provides: ${unresolvedTypes.join(', ')}. ` +
				`If a component of a scanned package is meant to be one of them, add a @registryCategory JSDoc tag to it; ` +
				`ignore this for components you register by hand.`
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

	const dslRendererImport = options?.usePackageImports
		? `@wadeck-app/dsl-renderer`
		: `../../../dsl-renderer/src/engine/DslRenderer.js`;
	const dslRendererTypesImport = options?.usePackageImports
		? `@wadeck-app/dsl-renderer`
		: `../../../dsl-renderer/src/ComponentRegistry.js`;
	const lazyBoundaryImport = options?.usePackageImports
		? `@wadeck-app/dsl-renderer`
		: `../../../dsl-renderer/src/engine/LazyBoundary.js`;

	const hasLazyComponent = allDiscovered.some(c => c.lazy);
	if (hasLazyComponent) {
		importLines.push(`import { LazyBoundary } from '${lazyBoundaryImport}'`);
	}

	for (const component of allDiscovered) {
		const importPath = relativeImportPath(component.sourcePath, outputDir);
		if (component.lazy) {
			// @registryLazy: split into its own chunk, fetched on first render instead of bundled eagerly.
			// LazyBoundary scopes both the loading state and a failed-chunk error to just this component's
			// own render output, instead of blanking or crashing the whole page.
			importLines.push(
				`const ${component.name}Lazy = React.lazy(() => import('${importPath}').then(m => ({ default: m.${component.name} })))`
			);
			importLines.push(
				`const ${component.name} = (props: React.ComponentProps<typeof ${component.name}Lazy>) => <LazyBoundary><${component.name}Lazy {...props} /></LazyBoundary>`
			);
		} else {
			importLines.push(`import { ${component.name} } from '${importPath}'`);
		}
	}

	// One namespace import per library that ships node schemas; a component without a schema export simply gets none.
	const schemaAliases = new Map<string, string>();
	const schemaAliasOf = (component: DiscoveredComponent): string | null => {
		const schemaModule = findNodeSchemaModule(component.sourcePath);
		if (!schemaModule) {
			return null;
		}
		let alias = schemaAliases.get(schemaModule);
		if (!alias) {
			alias = `nodeSchemas${schemaAliases.size}`;
			schemaAliases.set(schemaModule, alias);
			importLines.push(`import * as ${alias} from '${relativeImportPath(schemaModule, outputDir)}'`);
		}
		return alias;
	};
	const componentSchemaAlias = new Map(allDiscovered.map(c => [c.name, schemaAliasOf(c)] as const));

	// coerceProp is imported only when a generated line calls it, so a library without checkable props does not get
	// an unused import (a noUnusedLocals error in the consumer).
	const buildHeader = (coerceHelpers: string[]) => `// src/generated/entries.tsx - AUTO-GENERATED by entriesGenerator.ts at build/dev-server start. DO NOT EDIT MANUALLY.
// All changes must be made in: packages/dsl-renderer/src/build/entriesGenerator.ts
import React from 'react'
import { ${[...coerceHelpers, 'renderChildren', 'resolveExpressionValue'].join(', ')} } from '${dslRendererImport}'
import type { ComponentRegistryEntry, RegistryRenderProps } from '${dslRendererTypesImport}'
${importLines.join('\n')}
`;

	// Generate one entry per discovered component
	const moduleLevelBlocks: string[] = [];
	const project = new Project({ skipFileDependencyResolution: true });
	// Every file is added before the first type query so the program is built once, not rebuilt per added file.
	for (const component of allDiscovered) {
		if (!project.getSourceFile(component.sourcePath)) project.addSourceFileAtPath(component.sourcePath);
	}
	const entriesBody = allDiscovered.map(component => {
		const importPath = relativeImportPath(component.sourcePath, outputDir);
		const renderBlock = generateSimpleEntry(component, importPath, moduleLevelBlocks, project);
		const tagsJson = JSON.stringify(component.tags);
		const schemaAlias = componentSchemaAlias.get(component.name);
		const propSchemaLine = schemaAlias ? `\n\tpropSchema: pickPropSchema(${schemaAlias} as Record<string, unknown>, '${component.name}', isDevelopment()),` : '';

		return `export const ${component.name}Entry: ComponentRegistryEntry = {
	name: '${component.name}', category: '${component.category}', tags: ${tagsJson},
	nodeSchema: null as never,${propSchemaLine}
	${renderBlock}
}`;
	}).join('\n\n');

	// allEntries array
	const allEntriesLines = allDiscovered.map(c => `\t${c.name}Entry,`).join('\n');

	// Metadata (allowedChildren, knownKeys, providesContext, requiresContext)
	const metadataLines = allDiscovered
		.map(c => {
			const entryVar = `${c.name}Entry`;
			const lines: string[] = [];
			if (Object.keys(c.allowedChildren).length > 0) {
				lines.push(`${entryVar}.allowedChildren = ${JSON.stringify(c.allowedChildren)};`);
			}
			if (c.mapSlots && Object.keys(c.mapSlots).length > 0) {
				lines.push(`${entryVar}.mapSlots = ${JSON.stringify(c.mapSlots)};`);
			}
			if (c.itemKeys && Object.keys(c.itemKeys).length > 0) {
				lines.push(`${entryVar}.itemKeys = ${JSON.stringify(c.itemKeys)};`);
			}
			if (c.knownKeys) {
				lines.push(`${entryVar}.knownKeys = ${JSON.stringify(c.knownKeys)};`);
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

	const moduleLevelText = moduleLevelBlocks.length > 0
		? '\n// ─── Stable wrapper components (module scope: one declared inside render would remount its field on every render) ───\n\n' + moduleLevelBlocks.join('\n\n') + '\n'
		: '';

	const generated = moduleLevelText + entriesBody;
	const coerceHelpers = ['coerceDate', 'coerceProp', 'coerceStringList', 'isDevelopment', 'pickPropSchema'].filter(helper => generated.includes(`${helper}(`));
	return buildHeader(coerceHelpers) + moduleLevelText + '\n' + entriesBody + tail;
}

// ─── Vite plugin ──────────────────────────────────────────────────────────────

// Walk up from this file to find the monorepo root.
// In the dsl-view source: build/ -> src/ -> dsl-renderer/ -> packages/ -> root (4 levels up).
// When installed as npm package: dist/build/ -> dist/ -> @wadeck-app/dsl-renderer/ -> @wadeck-app/ -> node_modules/ -> ... (not a monorepo root).
export const DEFAULT_MONOREPO_ROOT = path.resolve(__dirname, '../../../..');

export interface EntriesGeneratorOptions {
	/** Root scanned for `packages/<name>/src/components` before the app's own workspace. Defaults to DEFAULT_MONOREPO_ROOT. */
	monorepoRoot?: string;
}

export function entriesGenerator(options: EntriesGeneratorOptions = {}): Plugin {
	let appRoot = '';
	let outputPath = '';
	let watchDirs: Array<{ pkg: string; absDir: string }> = [];
	let buildOptions: BuildEntriesOptions = {};

	const monorepoRoot = options.monorepoRoot ?? DEFAULT_MONOREPO_ROOT;
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
			const isWatched = watchDirs.some(({ absDir }) => isPathInside(absDir, file));
			if (isWatched) {
				generate();
			}
		},
	};
}
