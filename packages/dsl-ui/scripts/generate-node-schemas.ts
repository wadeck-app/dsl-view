/**
 * generate-node-schemas.ts
 *
 * Scans all XxxProps interfaces exported from src/components/*.tsx and generates
 * src/schemas/generated-node-schemas.ts with the corresponding Zod schemas.
 *
 * Run via: npm run generate-node-schemas
 * Uses ts-morph (available in workspace root node_modules).
 *
 * Supported TypeScript -> Zod mappings:
 *   string               -> z.string()
 *   number               -> z.number()
 *   boolean              -> z.boolean()
 *   unknown              -> z.unknown()
 *   T[]                  -> z.array(...)
 *   'literal'            -> z.literal('literal')
 *   'a' | 'b' | 'c'     -> z.enum(['a', 'b', 'c'])
 *   Record<string, T>    -> z.record(z.string(), ...)
 *   T | undefined        -> optional on the property
 *   T | null             -> .nullable()
 *   { field: T }         -> z.object({ field: ... })
 *   LocalInterface       -> LocalInterfaceSchema for same-file references
 *   @default value       -> .default(value)
 *   callback (=> ...)    -> skipped (not serializable)
 *   React.ReactNode      -> z.array(z.unknown()).optional()
 *
 * For complex nested types (e.g. EventFilterChips items), a local sub-schema is generated.
 */
import { readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	type InterfaceDeclaration,
	Project,
	type PropertySignature,
	type SourceFile,
	SyntaxKind,
	type TypeNode,
} from 'ts-morph';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const componentsDir = path.resolve(__dirname, '../src/components');
const outFile = path.resolve(__dirname, '../src/schemas/generated-node-schemas.ts');

// Set of interface names in the current file being processed (populated per file)
let currentFileInterfaces: Set<string> = new Set();
// Name of the interface whose schema is being generated (to detect self-references)
let currentInterfaceName: string | null = null;

// --- Type -> Zod conversion ----------------------------------------------------

function typeNodeToZod(typeNode: TypeNode, indent = ''): string | null {
	const kindName = typeNode.getKindName();

	// Callback types (function signatures) -> skip (return null signals caller to omit)
	if (kindName === 'FunctionType') {
		return null;
	}

	if (kindName === 'StringKeyword') {
		return 'z.string()';
	}
	if (kindName === 'NumberKeyword') {
		return 'z.number()';
	}
	if (kindName === 'BooleanKeyword') {
		return 'z.boolean()';
	}
	if (kindName === 'UnknownKeyword') {
		return 'z.unknown()';
	}

	if (kindName === 'LiteralType') {
		const inner = typeNode.asKind(SyntaxKind.LiteralType);
		if (inner) {
			const lit = inner.getLiteral();
			if (lit.getKind() === SyntaxKind.StringLiteral) {
				return `z.literal(${lit.getText()})`;
			}
			if (lit.getKind() === SyntaxKind.NumericLiteral) {
				return `z.literal(${lit.getText()})`;
			}
			if (lit.getKind() === SyntaxKind.TrueKeyword) {
				return 'z.literal(true)';
			}
			if (lit.getKind() === SyntaxKind.FalseKeyword) {
				return 'z.literal(false)';
			}
		}
	}

	// Parenthesized types: (T | U) — unwrap and recurse
	if (kindName === 'ParenthesizedType') {
		const paren = typeNode.asKind(SyntaxKind.ParenthesizedType);
		if (paren) {
			return typeNodeToZod(paren.getTypeNode(), indent);
		}
	}

	if (kindName === 'ArrayType') {
		const arr = typeNode.asKind(SyntaxKind.ArrayType);
		if (arr) {
			const elem = typeNodeToZod(arr.getElementTypeNode(), indent);
			return `z.array(${elem ?? 'z.unknown()'})`;
		}
	}

	if (kindName === 'UnionType') {
		const union = typeNode.asKind(SyntaxKind.UnionType);
		if (union) {
			const types = union.getTypeNodes();
			const hasUndefined = types.some(t => t.getKindName() === 'UndefinedKeyword');
			const hasNull = types.some(t => {
				if (t.getKindName() === 'NullKeyword') {
					return true;
				}
				// In TypeScript AST, null can appear as LiteralType { NullKeyword }
				const lit = t.asKind(SyntaxKind.LiteralType);
				return lit?.getLiteral().getKind() === SyntaxKind.NullKeyword;
			});
			const nonMod = types.filter(t => {
				if (t.getKindName() === 'UndefinedKeyword') {
					return false;
				}
				if (t.getKindName() === 'NullKeyword') {
					return false;
				}
				// In TypeScript AST, null can appear as LiteralType { NullKeyword }
				const lit = t.asKind(SyntaxKind.LiteralType);
				if (lit?.getLiteral().getKind() === SyntaxKind.NullKeyword) {
					return false;
				}
				return true;
			});
			if (nonMod.length === 0) {
				return 'z.unknown()';
			}

			const allStringLiterals = nonMod.every(t => {
				const lit = t.asKind(SyntaxKind.LiteralType);
				return lit && lit.getLiteral().getKind() === SyntaxKind.StringLiteral;
			});
			if (allStringLiterals && nonMod.length > 1) {
				const values = nonMod.map(t => t.asKind(SyntaxKind.LiteralType)!.getLiteral().getText());
				let r = `z.enum([${values.join(', ')}])`;
				if (hasNull) {
					r += '.nullable()';
				}
				if (hasUndefined) {
					r += '.optional()';
				}
				return r;
			}

			if (nonMod.length === 1) {
				const inner = typeNodeToZod(nonMod[0]!, indent);
				// If the inner type is a callback, propagate null
				if (inner === null) {
					return null;
				}
				let r = inner;
				if (hasNull) {
					r += '.nullable()';
				}
				if (hasUndefined) {
					r += '.optional()';
				}
				return r;
			}

			// Filter out callbacks; if all are callbacks, return null
			const parts = nonMod.map(t => typeNodeToZod(t, indent)).filter((z): z is string => z !== null);
			if (parts.length === 0) {
				return null;
			}
			let r = `z.union([${parts.join(', ')}])`;
			if (hasNull) {
				r += '.nullable()';
			}
			if (hasUndefined) {
				r += '.optional()';
			}
			return r;
		}
	}

	if (kindName === 'TypeLiteral') {
		const obj = typeNode.asKind(SyntaxKind.TypeLiteral);
		if (obj) {
			const members = obj.getMembers();
			if (members.length === 0) {
				return 'z.object({})';
			}
			const ni = indent + '\t';
			const props = members
				.map(m => {
					if (m.getKind() === SyntaxKind.PropertySignature) {
						return propertyToZodField(m.asKind(SyntaxKind.PropertySignature)!, ni);
					}
					return null;
				})
				.filter((v): v is string => v !== null);
			return `z.object({\n${props.join(',\n')},\n${indent}})`;
		}
	}

	if (kindName === 'TypeReference') {
		const ref = typeNode.asKind(SyntaxKind.TypeReference);
		if (ref) {
			const name = ref.getTypeName().getText();
			const args = ref.getTypeArguments();

			// React.ReactNode or just ReactNode -> DSL slot (children)
			if (name === 'ReactNode' || name === 'React.ReactNode') {
				return 'z.array(z.unknown()).optional()';
			}

			if (name === 'Record' && args.length === 2) {
				return `z.record(${typeNodeToZod(args[0]!, indent) ?? 'z.unknown()'}, ${typeNodeToZod(args[1]!, indent) ?? 'z.unknown()'})`;
			}
			if (name === 'Array' && args.length === 1) {
				return `z.array(${typeNodeToZod(args[0]!, indent) ?? 'z.unknown()'})`;
			}
			// Self-reference (e.g. TreeNode.children: TreeNode[]): a `const XSchema = z.object({... XSchema ...})` is a
			// use-before-initialization error and an implicit-any, so a recursive edge degrades to z.unknown().
			if (name === currentInterfaceName) {
				return 'z.unknown()';
			}
			// Reference to an interface defined in the same file -> use inline sub-schema variable
			if (currentFileInterfaces.has(name)) {
				return `${name}Schema`;
			}
			// Reference to a type alias defined in the same file (e.g. `export type KeyStatus = 'active' | 'revoked'`)
			// -> resolve to its aliased type and recurse, so named unions still produce z.enum(...) instead of z.unknown()
			const typeAlias = typeNode.getSourceFile().getTypeAlias(name);
			if (typeAlias) {
				return typeNodeToZod(typeAlias.getTypeNodeOrThrow(), indent);
			}
		}
	}

	return 'z.unknown()';
}

// `@default` text may carry a trailing description (e.g. `@default true - updates label every 60s`):
// only the value itself (a quoted string, or the first token) is valid inside `.default(...)`.
function readDefault(prop: PropertySignature): string | null {
	for (const doc of prop.getJsDocs()) {
		for (const tag of doc.getTags()) {
			if (tag.getTagName() !== 'default') {
				continue;
			}
			const text = tag.getCommentText()?.trim();
			if (!text) {
				return null;
			}
			const quoted = text.match(/^('[^']*'|"[^"]*"|`[^`]*`)/);
			return quoted ? quoted[1]! : text.split(/\s+/)[0]!;
		}
	}
	return null;
}

// A ReactNode `children` prop is authored under the `items` DSL key: the generated render in
// dsl-renderer's entriesGenerator (generateSimpleEntry / extractKnownKeys) reads node['items'].
// Keep this rule in sync with it (dsl-ui's schema consistency test guards the drift).
// Optional directives other than `$type` (required). Must equal KNOWN_DSL_KEYS minus `$type` in dsl-renderer.
const BASE_NODE_DIRECTIVES = ['$if', '$source', '$context', '$route', '$extends', '$id', '$outputs'] as const;

// Mirror of isReactNodeSlotType in dsl-renderer's entriesGenerator: `ReactNode`, or a union of `ReactNode` and render
// functions (FieldWrapper). YAML cannot author a function, so for the DSL it is a plain node slot.
// The consistency test in generated-node-schemas.test.ts compares the result with the registry's knownKeys.
function isReactNodeSlot(typeText: string): boolean {
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
	const isNode = (member: string) => member === 'React.ReactNode' || member === 'ReactNode';
	const isRenderFunction = (member: string) => /^\(.*=>.*\)$/.test(member) || /^\(.*\)\s*=>/.test(member);
	return members.some(isNode) && members.every(member => isNode(member) || isRenderFunction(member) || member === 'undefined' || member === 'null');
}

function dslKeyFor(prop: PropertySignature): string {
	const name = prop.getName();
	const typeText = prop.getTypeNode()?.getText() ?? '';
	return name === 'children' && isReactNodeSlot(typeText) ? 'items' : name;
}

function propertyToZodField(prop: PropertySignature, indent: string): string | null {
	const name = prop.getName();
	const isOptional = prop.hasQuestionToken();
	const typeNode = prop.getTypeNode();
	if (!typeNode) {
		return `${indent}${name}: z.unknown()`;
	}

	const defaultValue = readDefault(prop);

	let zodExpr = typeNodeToZod(typeNode, indent);
	// Callback property -> skip
	if (zodExpr === null) {
		return null;
	}

	if (isOptional && !zodExpr.endsWith('.optional()')) {
		zodExpr += '.optional()';
	}

	if (defaultValue !== null) {
		if (zodExpr.endsWith('.optional()')) {
			zodExpr = zodExpr.slice(0, -'.optional()'.length);
		}
		zodExpr += `.default(${defaultValue})`;
	}

	return `${indent}${name}: ${zodExpr}`;
}

// Props the generated render never reads from the YAML node (mirrors extractKnownKeys in dsl-renderer): with the
// formData/onChange bind pattern, `value`/`onChange` are replaced by `bind`, and a toggle's `checked` too.
function bindConsumedProps(members: PropertySignature[], bindPattern: string[] | null): Set<string> {
	const consumed = new Set<string>();
	if (bindPattern?.[0] === 'formData' && bindPattern?.[1] === 'onChange') {
		consumed.add('value');
		consumed.add('onChange');
		consumed.add('bind');
		const names = members.map((m) => m.getName());
		if (names.includes('checked') && !names.includes('value')) {
			consumed.add('checked');
		}
	}
	return consumed;
}

// A YAML value may be an expression (`$sources.x`, `$vars.y`) that the renderer resolves later, so a node schema
// must accept one wherever it accepts a literal. Plain strings and unknown already do.
function withExpression(zodExpr: string): string {
	let core = zodExpr;
	let suffix = '';
	for (;;) {
		const m = /(\.optional\(\)|\.nullable\(\))$/.exec(core);
		if (!m) {
			break;
		}
		suffix = m[1] + suffix;
		core = core.slice(0, -m[1].length);
	}
	if (core === 'z.string()' || core === 'z.unknown()') {
		return zodExpr;
	}
	return `dsl(${core})${suffix}`;
}

function interfaceToZodSchema(iface: InterfaceDeclaration, schemaName: string, isNodeSchema = false, bindPattern: string[] | null = null): string {
	currentInterfaceName = iface.getName();
	const members = iface.getProperties();
	const lines: string[] = [];
	const consumed = isNodeSchema ? bindConsumedProps(members, bindPattern) : new Set<string>();
	if (isNodeSchema && bindPattern?.[0] === 'formData') {
		lines.push('\tbind: z.string().optional()');
	}

	for (const prop of members) {
		// Only top-level node schemas describe DSL nodes; sub-schemas keep the raw prop names.
		const name = isNodeSchema ? dslKeyFor(prop) : prop.getName();
		if (consumed.has(name)) {
			continue;
		}
		const isOptional = prop.hasQuestionToken();
		const typeNode = prop.getTypeNode();
		if (!typeNode) {
			lines.push(`\t${name}: z.unknown()`);
			continue;
		}

		const defaultValue = readDefault(prop);

		let zodExpr = typeNodeToZod(typeNode, '\t');
		// Callback property -> skip entirely
		if (zodExpr === null) {
			continue;
		}
		if (isNodeSchema) {
			// A prop whose YAML items have their own key spec (@itemKeys) is not shaped like the prop's TypeScript
			// type (DataTable columns: YAML `field` / `type: actions`, not TableColumn): the unknown-key walker owns it.
			const hasItemKeys = prop.getJsDocs().some((d) => d.getTags().some((t) => t.getTagName() === 'itemKeys'));
			if (hasItemKeys) {
				zodExpr = 'z.array(z.unknown())';
			}
			zodExpr = withExpression(zodExpr);
		}

		if (isOptional && !zodExpr.endsWith('.optional()')) {
			zodExpr += '.optional()';
		}
		if (defaultValue !== null) {
			if (zodExpr.endsWith('.optional()')) {
				zodExpr = zodExpr.slice(0, -'.optional()'.length);
			}
			zodExpr += `.default(${defaultValue})`;
		}
		lines.push(`\t${name}: ${zodExpr}`);
	}

	if (isNodeSchema) {
		// Node schemas extend baseNode (which contributes the `$type` / `$if` / ... directives)
		if (lines.length === 0) {
			return `const ${schemaName} = baseNode.extend({});`;
		}
		return `const ${schemaName} = baseNode.extend({\n${lines.join(',\n')},\n});`;
	}
	// Sub-schemas are plain z.object
	if (lines.length === 0) {
		return `const ${schemaName} = z.object({});`;
	}
	return `const ${schemaName} = z.object({\n${lines.join(',\n')},\n});`;
}

// --- Helper: generate sub-schemas for interfaces referenced by XxxProps -------

function collectReferencedInterfaces(
	sourceFile: SourceFile,
	ifaceName: string,
	visited = new Set<string>()
): Set<string> {
	if (visited.has(ifaceName)) {
		return visited;
	}
	visited.add(ifaceName);
	const iface = sourceFile.getInterface(ifaceName);
	if (!iface) {
		return visited;
	}
	// Find all TypeReference names in this interface's properties
	for (const prop of iface.getProperties()) {
		const typeNode = prop.getTypeNode();
		if (!typeNode) {
			continue;
		}
		// Walk the text to find TypeReference names that exist as interfaces in this file
		const text = typeNode.getText();
		for (const otherIface of sourceFile.getInterfaces()) {
			const name = otherIface.getName();
			// Match whole identifier only (not substring of another name)
			if (name !== ifaceName && new RegExp(`\\b${name}\\b`).test(text)) {
				collectReferencedInterfaces(sourceFile, name, visited);
			}
		}
	}
	return visited;
}

function generateSubSchemas(sourceFile: SourceFile, propsInterfaceName: string): string[] {
	const allInterfaces = sourceFile.getInterfaces().map(i => i.getName());
	currentFileInterfaces = new Set(allInterfaces);

	// Only generate sub-schemas for interfaces actually referenced by XxxProps (transitively)
	const referenced = collectReferencedInterfaces(sourceFile, propsInterfaceName);
	referenced.delete(propsInterfaceName); // the props itself is handled separately

	const blocks: string[] = [];
	// Preserve definition order from source file
	for (const iface of sourceFile.getInterfaces()) {
		const name = iface.getName();
		if (!referenced.has(name)) {
			continue;
		}
		if (name.endsWith('Props')) {
			continue;
		}
		// Sub-schemas: plain z.object (not baseNode.extend, not exported)
		const schemaCode = interfaceToZodSchema(iface, `${name}Schema`, false);
		blocks.push(schemaCode);
	}
	return blocks;
}

// --- Main ---------------------------------------------------------------------

const project = new Project({ skipFileDependencyResolution: true });

const files = (readdirSync(componentsDir, { recursive: true }) as string[])
	.filter(f => f.endsWith('.tsx') && !f.endsWith('.test.tsx') && !f.endsWith('.stories.tsx'))
	.sort();

const schemaBlocks: string[] = [];
let autoCount = 0;

for (const file of files) {
	const filePath = path.resolve(componentsDir, file);
	const sourceFile = project.addSourceFileAtPath(filePath);

	// Find exported component function with @registryCategory JSDoc tag
	let componentName: string | null = null;
	for (const fn of sourceFile.getFunctions()) {
		if (!fn.isExported()) {
			continue;
		}
		const name = fn.getName();
		if (!name || !name[0] || name[0] !== name[0].toUpperCase()) {
			continue;
		}
		const jsDoc = fn.getJsDocs()[0];
		if (!jsDoc) {
			continue;
		}
		if (jsDoc.getTags().some(t => t.getTagName() === 'registryCategory')) {
			componentName = name;
			break;
		}
	}
	if (!componentName) {
		continue;
	}

	// Look for XxxProps interface in the same file
	const propsInterface = sourceFile.getInterface(componentName + 'Props');
	if (!propsInterface) {
		continue;
	}

	const schemaName = componentName + 'NodeSchema';
	const allInterfaces = sourceFile.getInterfaces().map(i => i.getName());
	currentFileInterfaces = new Set(allInterfaces);

	// Generate sub-schemas for interfaces referenced by XxxProps
	const subSchemas = generateSubSchemas(sourceFile, componentName + 'Props');
	// Reset currentFileInterfaces to only include interfaces in this file
	currentFileInterfaces = new Set(sourceFile.getInterfaces().map(i => i.getName()));

	const componentDoc = sourceFile.getFunction(componentName)?.getJsDocs()[0];
	const bindTag = componentDoc?.getTags().find((t) => t.getTagName() === 'registryBind');
	const bindPattern = bindTag ? (bindTag.getCommentText() ?? '').trim().split(/\s+/).filter(Boolean) : null;
	const schemaCode = interfaceToZodSchema(propsInterface, schemaName, true, bindPattern);
	const fileBlock = [...subSchemas, `export ${schemaCode}`].join('\n\n');
	schemaBlocks.push(fileBlock);
	autoCount++;
}

const output = [
	'// src/schemas/generated-node-schemas.ts — GENERATED from XxxProps interfaces by scripts/generate-node-schemas.ts, do not edit',
	"import { z } from 'zod';",
	'',
	'// Directives every DSL node may carry (mirrors KNOWN_DSL_KEYS in dsl-renderer, a test keeps them in sync).',
	'// A node is authored with `$type`, never `type`: `type` is an ordinary prop of some components (Chart, ButtonAction).',
	'// Other keys are not rejected here: unknown keys are reported by the knownKeys check, not twice.',
	'const baseNode = z.object({',
	'\t$type: z.string(),',
	...BASE_NODE_DIRECTIVES.map((key) => `\t${key}: z.unknown().optional(),`),
	'});',
	'',
	'// A prop may hold an expression (`$sources.x`, `$vars.y`) resolved at render time, so it is accepted wherever the literal is.',
	"const expr = z.string().startsWith('$');",
	'const dsl = <T extends z.ZodType>(schema: T) => z.union([schema, expr]);',
	'',
	schemaBlocks.join('\n\n'),
	'',
].join('\n');

writeFileSync(outFile, output, 'utf-8');
console.log(`[ok] Generated generated-node-schemas.ts with ${autoCount} schemas`);
