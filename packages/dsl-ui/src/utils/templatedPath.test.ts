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
});
