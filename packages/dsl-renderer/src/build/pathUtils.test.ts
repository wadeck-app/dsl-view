import { describe, expect, it } from 'vitest';

import { isPathInside } from './pathUtils.js';

describe('isPathInside', () => {
	it('matches a posix-style file (what Vite hands handleHotUpdate) against a backslash dir (what path.join returns on Windows)', () => {
		expect(isPathInside('C:\\app\\src\\dsl\\pages', 'C:/app/src/dsl/pages/home.yaml', false)).toBe(true);
		expect(isPathInside('C:/app/src/dsl/pages', 'C:\\app\\src\\dsl\\pages\\home.yaml', false)).toBe(true);
	});

	it('matches nested files, the directory itself and a dir given with trailing slashes', () => {
		expect(isPathInside('/app/pages', '/app/pages/sub/deep/x.yaml', false)).toBe(true);
		expect(isPathInside('/app/pages', '/app/pages', false)).toBe(true);
		expect(isPathInside('/app/pages/', '/app/pages/x.yaml', false)).toBe(true);
		expect(isPathInside('/app/pages//', '/app/pages/x.yaml', false)).toBe(true);
	});

	it('only matches on a path-segment boundary', () => {
		expect(isPathInside('/app/pages', '/app/pages-old/x.yaml', false)).toBe(false);
		expect(isPathInside('/app/pages', '/app/page/x.yaml', false)).toBe(false);
		expect(isPathInside('/app/pages', '/other/app/pages/x.yaml', false)).toBe(false);
		expect(isPathInside('/app/pages/x', '/app/pages', false)).toBe(false);
	});

	it('is case sensitive unless told otherwise (Windows drive letters and folders)', () => {
		expect(isPathInside('c:\\App\\src', 'C:/app/SRC/x.yaml', true)).toBe(true);
		expect(isPathInside('c:\\App\\src', 'C:/app/SRC/x.yaml', false)).toBe(false);
	});

	it('defaults the case rule to the platform it runs on', () => {
		expect(isPathInside('/App', '/app/x')).toBe(process.platform === 'win32');
		expect(isPathInside('/app', '/app/x')).toBe(true);
	});

	it('treats a root directory as containing everything under it', () => {
		expect(isPathInside('/', '/anything/x.yaml', false)).toBe(true);
	});
});
