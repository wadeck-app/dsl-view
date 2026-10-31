// React-free expression grammar shared by the runtime resolver (engine/DslRenderer.tsx), the prop checks
// (nodePropIssues.ts) and the build tooling. A DSL string is an expression when it starts with `$` (a path such as
// `$sources.event.name`) or with `!` (a negation such as `!$validation.valid`). On top of plain paths, an expression
// may combine operands with `!`, `==`, `!=`, `&&`, `||` and parentheses, and build a string with `$concat(...)`:
//
//   $vars.payload != $validated.payload
//   !$validation.valid || $vars.payload != $validated.payload
//   $concat('/projects/', $route.project, '/tasks')
//
// Operands are `$path`, a quoted string ('a' or "a"), a number, true, false or null. Precedence, loosest first:
// `||`, `&&`, `==` / `!=`, `!`. `==` and `!=` are strict (`===` / `!==`): "1" does not equal 1. `&&` and `||` return
// the operand that decided the result, like JavaScript, so `$a || 'none'` is a fallback. A string that does not parse
// is NOT an operator expression: it keeps its old meaning (a plain path, or a literal), so no existing page changes.
//
// `$concat(a, b, ...)` joins its arguments as text (numbers and booleans included). When any argument is undefined,
// null or not a primitive (an object, a list) the result is undefined, never the text "undefined": a link or URL that
// is still missing a piece must not be built half-way.

type Token =
	| { kind: 'op'; value: '(' | ')' | ',' | '!' | '==' | '!=' | '&&' | '||' }
	| { kind: 'path'; value: string }
	| { kind: 'literal'; value: string | number | boolean | null };

type Node =
	| { kind: 'path'; path: string }
	| { kind: 'literal'; value: string | number | boolean | null }
	| { kind: 'not'; operand: Node }
	| { kind: 'concat'; args: Node[] }
	| { kind: 'binary'; op: '==' | '!=' | '&&' | '||'; left: Node; right: Node };

const OPERATOR_HINT = /==|!=|&&|\|\||^\s*!|\(/;
const NUMBER = /^-?\d+(?:\.\d+)?/;
const PATH_STOP = /[\s(),!=&|'"]/;

function tokenize(source: string): Token[] | undefined {
	const tokens: Token[] = [];
	let i = 0;
	while (i < source.length) {
		const char = source[i]!;
		if (/\s/.test(char)) {
			i++;
			continue;
		}
		const two = source.slice(i, i + 2);
		if (two === '==' || two === '!=' || two === '&&' || two === '||') {
			tokens.push({ kind: 'op', value: two });
			i += 2;
			continue;
		}
		if (char === '(' || char === ')' || char === ',' || char === '!') {
			tokens.push({ kind: 'op', value: char });
			i++;
			continue;
		}
		if (char === "'" || char === '"') {
			const end = source.indexOf(char, i + 1);
			if (end === -1) {
				return undefined;
			}
			tokens.push({ kind: 'literal', value: source.slice(i + 1, end) });
			i = end + 1;
			continue;
		}
		if (char === '$') {
			let end = i + 1;
			while (end < source.length && !PATH_STOP.test(source[end]!)) {
				end++;
			}
			if (end === i + 1) {
				return undefined;
			}
			tokens.push({ kind: 'path', value: source.slice(i, end) });
			i = end;
			continue;
		}
		const rest = source.slice(i);
		const number = NUMBER.exec(rest);
		if (number) {
			tokens.push({ kind: 'literal', value: Number(number[0]) });
			i += number[0].length;
			continue;
		}
		const word = /^(true|false|null)(?![\w$.])/.exec(rest);
		if (word) {
			tokens.push({ kind: 'literal', value: word[1] === 'null' ? null : word[1] === 'true' });
			i += word[1]!.length;
			continue;
		}
		return undefined;
	}
	return tokens;
}

function parse(tokens: Token[]): Node | undefined {
	let position = 0;
	const peekOp = (): string | undefined => {
		const token = tokens[position];
		return token?.kind === 'op' ? token.value : undefined;
	};
	const parseOr = (): Node | undefined => {
		let left = parseAnd();
		while (left && peekOp() === '||') {
			position++;
			const right = parseAnd();
			if (!right) {
				return undefined;
			}
			left = { kind: 'binary', op: '||', left, right };
		}
		return left;
	};
	const parseAnd = (): Node | undefined => {
		let left = parseEquality();
		while (left && peekOp() === '&&') {
			position++;
			const right = parseEquality();
			if (!right) {
				return undefined;
			}
			left = { kind: 'binary', op: '&&', left, right };
		}
		return left;
	};
	const parseEquality = (): Node | undefined => {
		let left = parseUnary();
		while (left && (peekOp() === '==' || peekOp() === '!=')) {
			const op = peekOp() as '==' | '!=';
			position++;
			const right = parseUnary();
			if (!right) {
				return undefined;
			}
			left = { kind: 'binary', op, left, right };
		}
		return left;
	};
	const parseUnary = (): Node | undefined => {
		if (peekOp() === '!') {
			position++;
			const operand = parseUnary();
			return operand ? { kind: 'not', operand } : undefined;
		}
		return parsePrimary();
	};
	const parsePrimary = (): Node | undefined => {
		const token = tokens[position];
		if (!token) {
			return undefined;
		}
		const next = tokens[position + 1];
		if (token.kind === 'path' && token.value === '$concat' && next?.kind === 'op' && next.value === '(') {
			position += 2;
			const args: Node[] = [];
			for (;;) {
				const arg = parseOr();
				if (!arg) {
					return undefined;
				}
				args.push(arg);
				const separator = peekOp();
				position++;
				if (separator === ')') {
					return { kind: 'concat', args };
				}
				if (separator !== ',') {
					return undefined;
				}
			}
		}
		if (token.kind === 'path') {
			position++;
			return { kind: 'path', path: token.value };
		}
		if (token.kind === 'literal') {
			position++;
			return { kind: 'literal', value: token.value };
		}
		if (token.value === '(') {
			position++;
			const inner = parseOr();
			if (!inner || peekOp() !== ')') {
				return undefined;
			}
			position++;
			return inner;
		}
		return undefined;
	};
	const tree = parseOr();
	return tree && position === tokens.length ? tree : undefined;
}

function hasPath(node: Node): boolean {
	switch (node.kind) {
		case 'path':
			return true;
		case 'literal':
			return false;
		case 'not':
			return hasPath(node.operand);
		case 'concat':
			return true;
		case 'binary':
			return hasPath(node.left) || hasPath(node.right);
	}
}

const parsed = new Map<string, Node | null>();

/** The syntax tree of an operator expression, or undefined when the string is not one (see the header). */
function parseOperatorExpression(source: string): Node | undefined {
	const cached = parsed.get(source);
	if (cached !== undefined) {
		return cached ?? undefined;
	}
	let tree: Node | undefined;
	if (OPERATOR_HINT.test(source)) {
		const tokens = tokenize(source);
		tree = tokens && tokens.length > 0 ? parse(tokens) : undefined;
		// A bare `!text` or `(1)` carries no `$path`: it is a literal string, not an expression.
		if (tree && !hasPath(tree)) {
			tree = undefined;
		}
	}
	parsed.set(source, tree ?? null);
	return tree;
}

/**
 * True when the string is an expression the renderer resolves: it starts with `$`, or it is an operator expression
 * that starts with `!` (`!$validation.valid`). A text like "!important" is not.
 */
export function isExpressionString(value: string): boolean {
	if (value.startsWith('$')) {
		return true;
	}
	return value.trimStart().startsWith('!') && parseOperatorExpression(value) !== undefined;
}

function evaluate(node: Node, resolvePath: (path: string) => unknown): unknown {
	switch (node.kind) {
		case 'path':
			return resolvePath(node.path);
		case 'literal':
			return node.value;
		case 'not':
			return !evaluate(node.operand, resolvePath);
		case 'concat': {
			let text = '';
			for (const arg of node.args) {
				const part = evaluate(arg, resolvePath);
				if (typeof part !== 'string' && typeof part !== 'number' && typeof part !== 'boolean') {
					return undefined;
				}
				text += String(part);
			}
			return text;
		}
		case 'binary': {
			const left = evaluate(node.left, resolvePath);
			if (node.op === '&&') {
				return left ? evaluate(node.right, resolvePath) : left;
			}
			if (node.op === '||') {
				return left ? left : evaluate(node.right, resolvePath);
			}
			const right = evaluate(node.right, resolvePath);
			return node.op === '==' ? left === right : left !== right;
		}
	}
}

/**
 * Evaluates `source` when it is an operator expression: `{ matched: true, value }`. Anything else (a plain `$path`, a
 * literal, a string that does not parse) is `{ matched: false }` and the caller keeps its previous behaviour.
 */
export function evaluateOperatorExpression(
	source: string,
	resolvePath: (path: string) => unknown
): { matched: true; value: unknown } | { matched: false } {
	const tree = parseOperatorExpression(source);
	if (!tree) {
		return { matched: false };
	}
	return { matched: true, value: evaluate(tree, resolvePath) };
}
