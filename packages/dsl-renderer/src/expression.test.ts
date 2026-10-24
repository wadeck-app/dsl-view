import { describe, expect, it } from 'vitest';

import { evaluateOperatorExpression, isExpressionString } from './expression.js';

// Paths resolve against this table; an unknown path is undefined, like a source that has not loaded yet.
const values: Record<string, unknown> = {
	'$vars.payload': '{"a":1}',
	'$validated.payload': '{"a":1}',
	'$validation.valid': true,
	'$empty': '',
	'$zero': 0,
	'$no': false,
	'$nothing': null,
	'$name': 'ping',
	'$count': 3,
};
const resolvePath = (path: string): unknown => values[path];

function run(source: string): unknown {
	const result = evaluateOperatorExpression(source, resolvePath);
	if (!result.matched) {
		throw new Error(`not an operator expression: ${source}`);
	}
	return result.value;
}

describe('operator expressions: values', () => {
	it('== and != compare strictly: "1" is not 1, null is not undefined', () => {
		expect(run("$count == 3")).toBe(true);
		expect(run("$count == '3'")).toBe(false);
		expect(run("$count != '3'")).toBe(true);
		expect(run('$nothing == null')).toBe(true);
		expect(run('$nothing == $missing')).toBe(false);
		expect(run('$nothing != $missing')).toBe(true);
	});

	it('two undefined operands are equal (a page that has not loaded anything yet)', () => {
		expect(run('$missing == $other')).toBe(true);
		expect(run('$missing != $other')).toBe(false);
	});

	it('the queue-owner rule: disabled until validated and unchanged since', () => {
		const disabled = '!$validation.valid || $vars.payload != $validated.payload';
		expect(run(disabled)).toBe(false);
		expect(evaluateOperatorExpression(disabled, path => ({ ...values, '$vars.payload': 'edited' })[path])).toStrictEqual({
			matched: true,
			value: true,
		});
		expect(evaluateOperatorExpression(disabled, path => ({ ...values, '$validation.valid': false })[path])).toStrictEqual({
			matched: true,
			value: true,
		});
		// Nothing validated yet: the echoed request is undefined, so the payload differs.
		expect(evaluateOperatorExpression(disabled, path => ({ ...values, '$validated.payload': undefined })[path])).toStrictEqual({
			matched: true,
			value: true,
		});
	});

	it('! negates truthiness, also of falsy values', () => {
		expect(run('!$no')).toBe(true);
		expect(run('!$zero')).toBe(true);
		expect(run('!$empty')).toBe(true);
		expect(run('!$missing')).toBe(true);
		expect(run('!$nothing')).toBe(true);
		expect(run('!$count')).toBe(false);
		expect(run('!!$count')).toBe(true);
	});

	it('&& and || return the operand that decided the result, like JavaScript', () => {
		expect(run('$name && $count')).toBe(3);
		expect(run('$empty && $count')).toBe('');
		expect(run('$empty || $name')).toBe('ping');
		expect(run('$name || $count')).toBe('ping');
		expect(run("$missing || 'none'")).toBe('none');
	});

	it('&& and || do not evaluate the right operand when the left one decides', () => {
		const asked: string[] = [];
		const spy = (path: string): unknown => {
			asked.push(path);
			return values[path];
		};
		evaluateOperatorExpression('$name || $count', spy);
		evaluateOperatorExpression('$empty && $count', spy);
		expect(asked).toStrictEqual(['$name', '$empty']);
	});
});

describe('operator expressions: precedence and grouping', () => {
	it('&& binds tighter than ||', () => {
		expect(run('$name || $no && $no')).toBe('ping');
		expect(run('$no && $no || $count')).toBe(3);
	});

	it('== and != bind tighter than && and ||', () => {
		expect(run('$count == 3 && $name == "ping"')).toBe(true);
		expect(run('$count == 4 || $name == "ping"')).toBe(true);
		expect(run('$count == 4 && $name == "ping" || $no')).toBe(false);
	});

	it('! binds tighter than ==', () => {
		// (!$no) == true, not !($no == true)
		expect(run('!$no == true')).toBe(true);
		expect(run('!$count == false')).toBe(true);
	});

	it('parentheses override precedence', () => {
		expect(run('($count == 3 || $no) && $name == "ping"')).toBe(true);
		expect(run('!($count == 3 && $name == "ping")')).toBe(false);
		expect(run('$no && ($count || $name)')).toBe(false);
		expect(run('($name)')).toBe('ping');
	});

	it('== chains from the left', () => {
		expect(run('$no == false == true')).toBe(true);
	});
});

describe('operator expressions: literals', () => {
	it('understands numbers, booleans and null', () => {
		expect(run('$count == 3.0')).toBe(true);
		expect(run('$zero == 0')).toBe(true);
		expect(run('$count != -1')).toBe(true);
		expect(run('$no == false')).toBe(true);
		expect(run('$nothing == null')).toBe(true);
	});

	it('an operator inside a quoted string is text, not an operator', () => {
		expect(run('$name == "a || b"')).toBe(false);
		expect(run("$name != 'x && y'")).toBe(true);
	});

	it('does not read true/false/null that start a longer word as a literal', () => {
		expect(evaluateOperatorExpression('$a == trueish', resolvePath)).toStrictEqual({ matched: false });
		expect(evaluateOperatorExpression('$a == nullable', resolvePath)).toStrictEqual({ matched: false });
	});
});

describe('strings that are NOT operator expressions keep their old meaning', () => {
	it.each([
		['a plain path', '$sources.event.name'],
		['a path with dashes and dollar segments', '$ctx.$actionPending.push-test'],
		['a literal with no marker', 'plain text'],
		['a literal that merely starts with a bang', '!important'],
		['a bang followed by a number only', '!5'],
		['a literal in parentheses with no path', '(1 == 1)'],
		['an unterminated quote', '$name == "open'],
		['a dangling operator', '$name =='],
		['a leading operator', '== $name'],
		['an unclosed parenthesis', '($name == 1'],
		['an unmatched closing parenthesis', '$name == 1)'],
		['an empty path', '$ == 1'],
		['a single = sign', '$name = 1'],
		['adjacent operands', '$name $count'],
		['two literals compared (no path to read)', '"a == b" == "a == b"'],
	])('%s (%s) is left to the caller', (_label, source) => {
		expect(evaluateOperatorExpression(source, resolvePath)).toStrictEqual({ matched: false });
	});
});

describe('isExpressionString', () => {
	it('is true for every $-leading string, as before', () => {
		expect(isExpressionString('$sources.x')).toBe(true);
		expect(isExpressionString('$')).toBe(true);
		expect(isExpressionString('$5 USD')).toBe(true);
	});

	it('is true for a ! expression that has a path operand', () => {
		expect(isExpressionString('!$validation.valid')).toBe(true);
		expect(isExpressionString('  !$a || $b')).toBe(true);
		expect(isExpressionString('!($a == 1)')).toBe(true);
	});

	it('is false for plain text, including text with a bang or operators', () => {
		expect(isExpressionString('hello')).toBe(false);
		expect(isExpressionString('!important')).toBe(false);
		expect(isExpressionString('!true')).toBe(false);
		expect(isExpressionString('a == b')).toBe(false);
		expect(isExpressionString('')).toBe(false);
	});
});
