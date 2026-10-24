import { describe, expect, it } from 'vitest';
import { buildTemplatedPath, fillTemplate } from './templatedPath.js';

describe('fillTemplate', () => {
	it('reports the first placeholder without a value and still fills the others', () => {
		expect(fillTemplate('/a/{x}/b/{y}', { y: 'Y' })).toStrictEqual({ text: '/a//b/Y', missing: 'x' });
		expect(fillTemplate('/a/{x}/b/{y}', {})).toStrictEqual({ text: '/a//b/', missing: 'x' });
	});

	it('treats null, undefined and the empty string as missing, but 0 and false as real data', () => {
		expect(fillTemplate('/p/{v}', { v: null }).missing).toBe('v');
		expect(fillTemplate('/p/{v}', { v: undefined }).missing).toBe('v');
		expect(fillTemplate('/p/{v}', { v: '' }).missing).toBe('v');
		expect(fillTemplate('/p/{v}', { v: 0 })).toStrictEqual({ text: '/p/0' });
		expect(fillTemplate('/p/{v}', { v: false })).toStrictEqual({ text: '/p/false' });
	});

	it('has no missing key at all (not even undefined) when everything is filled', () => {
		expect(fillTemplate('/p/{v}', { v: 'x' })).toStrictEqual({ text: '/p/x' });
		expect(fillTemplate('/p', {})).toStrictEqual({ text: '/p' });
	});

	it('does not read inherited fields: {constructor} is missing, not a function source', () => {
		expect(fillTemplate('/x/{constructor}', {})).toStrictEqual({ text: '/x/', missing: 'constructor' });
		expect(fillTemplate('{toString}', {})).toStrictEqual({ text: '', missing: 'toString' });
	});
});

describe('buildTemplatedPath', () => {
	it('interpolates a single placeholder from the matching row field', () => {
		expect(buildTemplatedPath('/files/{id}', { id: '42' })).toBe('/files/42');
	});

	it('interpolates multiple placeholders', () => {
		expect(buildTemplatedPath('/scopes/{scopeId}/files/{id}', { scopeId: 's1', id: '42' })).toBe('/scopes/s1/files/42');
	});

	it('resolves a missing row field to an empty string rather than throwing', () => {
		expect(buildTemplatedPath('/files/{id}', {})).toBe('/files/');
	});

	it('returns the template unchanged when it has no placeholders', () => {
		expect(buildTemplatedPath('/files', { id: '42' })).toBe('/files');
	});

	it('stringifies a non-string field value', () => {
		expect(buildTemplatedPath('/files/{id}', { id: 42 })).toBe('/files/42');
	});

	it('keeps falsy values that are real data (0, false) and empties only null and undefined', () => {
		expect(buildTemplatedPath('/p/{n}/{ok}', { n: 0, ok: false })).toBe('/p/0/false');
		expect(buildTemplatedPath('/p/{a}/{b}', { a: null, b: undefined })).toBe('/p//');
	});

	it('replaces every occurrence of a repeated placeholder', () => {
		expect(buildTemplatedPath('/{id}/copy-of-{id}', { id: 'x' })).toBe('/x/copy-of-x');
	});

	it('leaves anything that is not a plain {word} placeholder untouched', () => {
		expect(buildTemplatedPath('/a/{}/{user.id}/{a-b}/{ id }', { id: '1', a: 'A', b: 'B', user: { id: 'U' } })).toBe('/a/{}/{user.id}/{a-b}/{ id }');
	});

	it('percent-encodes each value so an id with / ? # % or a space stays one segment', () => {
		expect(buildTemplatedPath('/files/{id}', { id: 'a/b?c' })).toBe('/files/a%2Fb%3Fc');
		expect(buildTemplatedPath('/files/{id}', { id: 'x#y z%' })).toBe('/files/x%23y%20z%25');
		expect(buildTemplatedPath('/history?event={event}', { event: 'order created&x=1' })).toBe('/history?event=order%20created%26x%3D1');
	});

	it('takes the whole target from the row when the template is a single placeholder (a path the backend already built)', () => {
		expect(buildTemplatedPath('{href}', { href: '/modules/task/tasks/42?tab=1' })).toBe('/modules/task/tasks/42?tab=1');
		// not a single placeholder: the value is a segment and gets encoded
		expect(buildTemplatedPath('/{href}', { href: '/modules/task' })).toBe('/%2Fmodules%2Ftask');
		expect(buildTemplatedPath('{a}{b}', { a: 'x/y', b: 'z' })).toBe('x%2Fyz');
	});

	it('does not re-scan a substituted value for placeholders', () => {
		expect(buildTemplatedPath('/x/{a}', { a: '{b}', b: 'NO' })).toBe('/x/%7Bb%7D');
		expect(buildTemplatedPath('{a}', { a: '{b}', b: 'NO' })).toBe('{b}');
	});

	it('only reads the row\'s own fields: {constructor} and {toString} resolve to nothing, not to function source', () => {
		expect(buildTemplatedPath('/x/{constructor}/{toString}', {})).toBe('/x//');
		expect(buildTemplatedPath('/x/{constructor}', { constructor: 'real' })).toBe('/x/real');
	});
});
