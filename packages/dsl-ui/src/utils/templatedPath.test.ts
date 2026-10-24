import { describe, expect, it } from 'vitest';
import { buildTemplatedPath } from './templatedPath.js';

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

	it('does not encode values: a caller that needs encoding must pre-encode (the value is spliced as is)', () => {
		expect(buildTemplatedPath('/files/{id}', { id: 'a/b?c' })).toBe('/files/a/b?c');
	});

	it('does not re-scan a substituted value for placeholders', () => {
		expect(buildTemplatedPath('/x/{a}', { a: '{b}', b: 'NO' })).toBe('/x/{b}');
	});

	it('only reads the row\'s own fields: {constructor} and {toString} resolve to nothing, not to function source', () => {
		expect(buildTemplatedPath('/x/{constructor}/{toString}', {})).toBe('/x//');
		expect(buildTemplatedPath('/x/{constructor}', { constructor: 'real' })).toBe('/x/real');
	});
});
