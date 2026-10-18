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
function dslKeyFor(prop: PropertySignature): string {
	const name = prop.getName();
	const typeText = prop.getTypeNode()?.getText() ?? '';
	const isReactNode = typeText === 'React.ReactNode' || typeText === 'ReactNode';
	return name === 'children' && isReactNode ? 'items' : name;
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

function interfaceToZodSchema(iface: InterfaceDeclaration, schemaName: string, isNodeSchema = false): string {
	currentInterfaceName = iface.getName();
	const members = iface.getProperties();
	const lines: string[] = [];

	for (const prop of members) {
		// Only top-level node schemas describe DSL nodes; sub-schemas keep the raw prop names.
		const name = isNodeSchema ? dslKeyFor(prop) : prop.getName();
		// type is handled by baseNode.extend — only skip for top-level node schemas
		if (isNodeSchema && name === 'type') {
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
		// Node schemas extend baseNode (which contributes `type: z.string()`)
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

	const schemaCode = interfaceToZodSchema(propsInterface, schemaName, true);
	const fileBlock = [...subSchemas, `export ${schemaCode}`].join('\n\n');
	schemaBlocks.push(fileBlock);
	autoCount++;
}

const output = [
	'// src/schemas/generated-node-schemas.ts — GENERATED from XxxProps interfaces by scripts/generate-node-schemas.ts, do not edit',
	"import { z } from 'zod';",
	'',
	'const baseNode = z.object({ type: z.string() });',
	'',
	schemaBlocks.join('\n\n'),
	'',
].join('\n');

writeFileSync(outFile, output, 'utf-8');
console.log(`[ok] Generated generated-node-schemas.ts with ${autoCount} schemas`);
