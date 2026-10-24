import { describe, expect, it } from 'vitest';

import { buildLinkPath, linkTargetProblem } from './linkTarget.js';

describe('linkTargetProblem', () => {
	it('accepts an absolute app path, with a query or a hash', () => {
		expect(linkTargetProblem('/modules/queue/history?status=failed#top', false)).toBeNull();
	});

	it('rejects a protocol-relative URL, which browsers read as another origin', () => {
		expect(linkTargetProblem('//evil.example/x', false)).toMatch(/single "\/"/);
	});

	it('rejects javascript: and data: targets', () => {
		expect(linkTargetProblem('javascript:alert(1)', false)).toMatch(/absolute app path/);
		expect(linkTargetProblem('javascript:alert(1)', true)).toMatch(/http:, https: or mailto:/);
		expect(linkTargetProblem('data:text/html,x', true)).toMatch(/http:, https: or mailto:/);
	});

	it('rejects a relative path for an internal link and names the way out', () => {
		expect(linkTargetProblem('history', false)).toMatch(/external: true/);
	});

	it('accepts http, https and mailto for an external link, whatever the case', () => {
		expect(linkTargetProblem('https://example.com/a', true)).toBeNull();
		expect(linkTargetProblem('HTTP://example.com', true)).toBeNull();
		expect(linkTargetProblem('mailto:a@b.c', true)).toBeNull();
	});

	it('rejects an external link that is an app path', () => {
		expect(linkTargetProblem('/local', true)).toMatch(/http:, https: or mailto:/);
	});

	// Security: the allowed scheme must be the very start of the target. A row-provided value that merely CONTAINS
	// "https:" later on (after a javascript: or data: scheme) must never become an anchor.
	it.each(['javascript:alert(1)//https://example.com', 'data:text/html,mailto:a@b.c', ' https://example.com', 'x-https://a.b'])(
		'rejects an external target that only contains an allowed scheme later on: %s',
		href => {
			expect(linkTargetProblem(href, true)).toMatch(/http:, https: or mailto:/);
		}
	);
});

describe('buildLinkPath', () => {
	it('fills placeholders and percent-encodes the values', () => {
		expect(buildLinkPath('/runs/{id}?event={event}', { id: 42, event: 'a b&c=d' })).toEqual({
			href: '/runs/42?event=a%20b%26c%3Dd',
		});
	});

	it('keeps zero and false: they are values, not missing', () => {
		expect(buildLinkPath('/x/{n}/{ok}', { n: 0, ok: false })).toEqual({ href: '/x/0/false' });
	});

	it.each([undefined, null, ''])('reports a placeholder whose value is %s, never an empty segment', value => {
		const result = buildLinkPath('/runs/{id}/logs', { id: value, other: 1 });
		expect(result.href).toBeUndefined();
		expect(result.problem).toContain('{id}');
		expect(result.problem).toContain('row keys: id, other');
	});

	// The row keys in the message help the page author: sorted, so the message does not depend on the field order.
	it('lists the row keys in alphabetical order', () => {
		const result = buildLinkPath('/runs/{id}', { zebra: 1, alpha: 2, id: undefined });
		expect(result.problem).toContain('row keys: alpha, id, zebra');
	});

	it('reports the first missing placeholder only once', () => {
		const result = buildLinkPath('/{a}/{b}', {});
		expect(result.problem).toContain('{a}');
		expect(result.problem).toContain('row keys: none');
	});

	it('reports a value that makes the target unusable', () => {
		// The encoded value cannot turn a path into another scheme, so the only way to fail is the template itself.
		expect(buildLinkPath('relative/{id}', { id: 1 }).problem).toMatch(/absolute app path/);
	});

	it('does not let a value smuggle a second origin into the target', () => {
		expect(buildLinkPath('/{x}', { x: '/evil.example' })).toEqual({ href: '/%2Fevil.example' });
	});

	it('takes a whole URL from an external template that is a single placeholder, still checking its scheme', () => {
		expect(buildLinkPath('{url}', { url: 'https://example.com/a?b=c' }, true)).toEqual({ href: 'https://example.com/a?b=c' });
		expect(buildLinkPath('{url}', { url: 'javascript:alert(1)' }, true).problem).toMatch(/http:, https: or mailto:/);
		// An internal template never gets the raw value: it stays percent-encoded.
		expect(buildLinkPath('/{x}', { x: 'a/b' })).toEqual({ href: '/a%2Fb' });
	});

	it('takes a whole app path from an internal template that is a single placeholder, still refusing other origins', () => {
		expect(buildLinkPath('{href}', { href: '/modules/task/tasks/1?tab=notes' })).toEqual({ href: '/modules/task/tasks/1?tab=notes' });
		expect(buildLinkPath('{href}', { href: '//evil.example/x' }).problem).toMatch(/single "\/"/);
		expect(buildLinkPath('{href}', { href: 'javascript:alert(1)' }).problem).toMatch(/absolute app path/);
	});

	it('never reads inherited fields: {constructor} is a missing value, not a function source', () => {
		expect(buildLinkPath('/x/{constructor}', {}).problem).toMatch(/placeholder \{constructor\}/);
	});

	it('checks an external template against the external rule', () => {
		expect(buildLinkPath('https://example.com/{id}', { id: 'a/b' }, true)).toEqual({ href: 'https://example.com/a%2Fb' });
		expect(buildLinkPath('/{id}', { id: 'a' }, true).problem).toMatch(/http:, https: or mailto:/);
	});
});
