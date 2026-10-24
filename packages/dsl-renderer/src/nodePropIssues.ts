import { describeReceived } from './engine/propWarnings.js';
import { isExpressionString } from './expression.js';

// Isomorphic and React-free on purpose: the runtime dev check (engine/warnInvalidNodeProps) and the build-time walk
// (build/unknownKeys) both ask the same question of a node: "which of its props does the component's generated schema
// reject?". One implementation, so the two can never disagree about what a mistake is.

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

/** One prop the component's schema rejects (a wrong value) or requires (and the node does not set). */
export interface NodePropIssue {
	/** The prop name. */
	key: string;
	/** `Type.prop`, the name used in messages. */
	where: string;
	/** False when the node does not set a required prop. */
	present: boolean;
	/** The zod issue code, or 'required'. Part of the once-only key of the runtime warning. */
	code: string;
	/** What the prop accepts, in the words of a YAML author ("a list", "one of ..."). */
	expected: string;
	/** What was received ("a map", "string", "nothing"). */
	received: string;
	/** ` (at rows.0.id)` for an issue inside a nested value, else empty. */
	subPath: string;
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
 * The props of `node` that the component's generated node schema (`propSchema`) rejects, plus the required props the node
 * does not set. Pure: it reports, it does not warn.
 *
 * @param resolve turns an authored `$expression` into its current value. The runtime passes the renderer's resolver; the
 *   compiler passes one that returns undefined, so an expression is never judged (it only has a value at runtime).
 *   A prop that resolves to nothing, and `null`, are not judged: that is a normal state (a `$sources` value not loaded
 *   yet, a YAML `key:` with nothing), not a mistake.
 */
export function findInvalidNodeProps(
	node: Record<string, unknown>,
	type: string,
	propSchema: unknown,
	ctx: Record<string, unknown>,
	resolve: (expression: unknown, ctx: Record<string, unknown>) => unknown
): NodePropIssue[] {
	const shape = shapeOf(propSchema);
	if (!shape) {
		return [];
	}
	const found: NodePropIssue[] = [];
	for (const [key, parser] of Object.entries(shape)) {
		// Directives are the renderer's business, `bind` is a form field name checked by the bound component.
		if (key.startsWith('$') || key === 'bind') {
			continue;
		}
		const present = Object.prototype.hasOwnProperty.call(node, key) && node[key] !== undefined;
		const raw = node[key];
		const value = typeof raw === 'string' && isExpressionString(raw) ? resolve(raw, ctx) : raw;
		if (present && value === undefined) {
			continue;
		}
		if (value === null) {
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
		found.push({
			key,
			where: `${type}.${key}`,
			present,
			code: issue?.code ?? 'required',
			expected: issue ? describeExpected(issue) : 'a value',
			received: present ? describeReceived(valueAt(value, issue?.path ?? [])) : 'nothing',
			subPath: issue && issue.path.length > 0 ? ` (at ${issue.path.join('.')})` : '',
		});
	}
	return found;
}
