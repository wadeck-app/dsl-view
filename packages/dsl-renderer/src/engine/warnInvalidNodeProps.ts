import type { ComponentRegistryEntry } from '../ComponentRegistry.js';
import { describeReceived, schemaWarnedProps } from './propWarnings.js';

// Dev-time safety net for the VALUE of an authored prop. A value of the wrong shape (a typo'd enum, a map where a list
// is expected, a string where a number is) is often accepted by the component and silently degrades: the page renders
// something wrong and nothing says why. The generated node schema (registry entry `propSchema`) knows what each prop
// accepts; this checks the RESOLVED value against it and warns once. It never changes rendering.
//
// - A prop still holding an expression that resolves to nothing (a `$sources` value that has not loaded yet) is not
//   checked: that is a normal state, not a mistake.
// - Only the props the node carries are checked, plus the required ones it lacks.

const warned = new Set<string>();

/** Test hook: forget what was already warned. */
export function resetInvalidPropWarnings(): void {
	warned.clear();
	schemaWarnedProps.clear();
}

type Parser = { safeParse(value: unknown): { success: true } | { success: false; error: { issues: ReadonlyArray<ZodIssueLike> } } };

interface ZodIssueLike {
	code: string;
	path: ReadonlyArray<PropertyKey>;
	message: string;
	expected?: string;
	values?: unknown[];
	// A union (a literal or an expression) lists the issues of each branch; the first one is the literal's.
	errors?: ReadonlyArray<ReadonlyArray<ZodIssueLike>>;
}

interface ZodDefLike {
	type?: string;
	innerType?: Parser;
	options?: Parser[];
}

const defOf = (parser: Parser): ZodDefLike | undefined => (parser as unknown as { _zod?: { def?: ZodDefLike } })._zod?.def;

// A generated prop schema is `dsl(literal)` = union([literal, expression]), possibly `.optional()`. For a text value the
// union reports only the expression branch ("must start with $"), which says nothing useful: judge the literal branch.
function literalBranch(parser: Parser): Parser {
	const def = defOf(parser);
	if ((def?.type === 'optional' || def?.type === 'default' || def?.type === 'nullable') && def.innerType) {
		return literalBranch(def.innerType);
	}
	if (def?.type === 'union' && def.options?.length === 2) {
		return def.options[0]!;
	}
	return parser;
}

// zod marks a key that may be left out of an object with optin = 'optional' (`.optional()`) or 'defaulted' (`.default(x)`,
// the generator writes it for props with a default value); `z.unknown()` is NOT one of them.
const isOptionalProp = (parser: Parser): boolean => {
	const optin = (parser as unknown as { _zod?: { optin?: string } })._zod?.optin;
	return optin === 'optional' || optin === 'defaulted';
};

// The deepest first issue of a nested union (hand-written schemas may nest them).
function leafIssue(issue: ZodIssueLike): ZodIssueLike {
	const nested = issue.errors?.[0]?.[0];
	return nested ? leafIssue(nested) : issue;
}

// The part of `value` an issue is about (`rows.0.id` -> the id of the first row), to describe what was really received.
function valueAt(value: unknown, path: ReadonlyArray<PropertyKey>): unknown {
	let current = value;
	for (const step of path) {
		if (current === null || typeof current !== 'object') {
			return undefined;
		}
		current = (current as Record<PropertyKey, unknown>)[step];
	}
	return current;
}

// What the prop accepts, in the words of a YAML author.
function describeExpected(issue: ZodIssueLike): string {
	if (issue.code === 'invalid_type' && issue.expected) {
		return issue.expected === 'array' ? 'a list' : issue.expected === 'object' ? 'a map' : `a ${issue.expected}`;
	}
	if (issue.code === 'invalid_value' && issue.values) {
		return `one of ${issue.values.map((value) => JSON.stringify(value)).join(', ')}`;
	}
	return issue.message;
}

function shapeOf(schema: unknown): Record<string, Parser> | undefined {
	const shape = (schema as { shape?: unknown } | undefined)?.shape;
	return shape !== null && typeof shape === 'object' ? (shape as Record<string, Parser>) : undefined;
}

/**
 * @param resolve the renderer's expression resolver, passed in to keep this module free of a circular import.
 */
export function warnInvalidNodeProps(
	node: Record<string, unknown>,
	type: string,
	entry: Pick<ComponentRegistryEntry, 'propSchema'>,
	ctx: Record<string, unknown>,
	resolve: (expression: unknown, ctx: Record<string, unknown>) => unknown
): void {
	const shape = shapeOf(entry.propSchema);
	if (!shape) {
		return;
	}
	for (const [key, parser] of Object.entries(shape)) {
		// Directives are the renderer's business, `bind` is a form field name checked by the bound component.
		if (key.startsWith('$') || key === 'bind') {
			continue;
		}
		const where = `${type}.${key}`;
		const present = Object.prototype.hasOwnProperty.call(node, key) && node[key] !== undefined;
		const raw = node[key];
		const value = typeof raw === 'string' && raw.startsWith('$') ? resolve(raw, ctx) : raw;
		if (present && value === undefined) {
			// An expression that does not resolve (yet): nothing to judge.
			continue;
		}
		if (value === null) {
			// `null` is "no value" everywhere (a YAML `key:` with nothing, a source field that is null), see coerceProp.
			continue;
		}
		if (!present && isOptionalProp(parser)) {
			continue;
		}
		const result = parser.safeParse(value);
		// A required prop that accepts anything (`z.unknown()`) still has to be set: no issue to quote then.
		if (result.success && present) {
			continue;
		}
		const detailed = literalBranch(parser).safeParse(value);
		const issues = result.success ? [] : detailed.success ? result.error.issues : detailed.error.issues;
		const issue = issues[0] ? leafIssue(issues[0]) : undefined;
		const expected = issue ? describeExpected(issue) : 'a value';
		const received = present ? describeReceived(valueAt(value, issue?.path ?? [])) : 'nothing';
		const subPath = issue && issue.path.length > 0 ? ` (at ${issue.path.join('.')})` : '';
		const id = `${where}|${issue?.code ?? 'required'}|${received}|${expected}`;
		if (warned.has(id)) {
			continue;
		}
		warned.add(id);
		schemaWarnedProps.add(where);
		console.warn(
			present
				? `[DslRenderer] ${where} expects ${expected}${subPath} but received ${received}: check the YAML value, the component may ignore it or render something unexpected.`
				: `[DslRenderer] ${where} is required (${expected}) but the node does not set it: the component may render nothing useful.`
		);
	}
}
