import { describe, expect, it } from 'vitest';
import { parseBreadcrumbSegments } from './breadcrumbSegments.js';

describe('parseBreadcrumbSegments', () => {
	it('returns empty array for root path', () => {
		expect(parseBreadcrumbSegments('/')).toEqual([]);
	});
	it('returns empty array for empty string', () => {
		expect(parseBreadcrumbSegments('')).toEqual([]);
	});
	it('parses single segment', () => {
		expect(parseBreadcrumbSegments('/files')).toEqual([
			{ label: 'files', path: '/files', isLast: true },
		]);
	});
	it('parses multiple segments', () => {
		expect(parseBreadcrumbSegments('/files/photos/vacation')).toEqual([
			{ label: 'files', path: '/files', isLast: false },
			{ label: 'photos', path: '/files/photos', isLast: false },
			{ label: 'vacation', path: '/files/photos/vacation', isLast: true },
		]);
	});
	it('handles leading slash', () => {
		expect(parseBreadcrumbSegments('/a/b')).toEqual([
			{ label: 'a', path: '/a', isLast: false },
			{ label: 'b', path: '/a/b', isLast: true },
		]);
	});
	it('filters empty segments (double slash)', () => {
		expect(parseBreadcrumbSegments('/a//b')).toEqual([
			{ label: 'a', path: '/a', isLast: false },
			{ label: 'b', path: '/a/b', isLast: true },
		]);
	});
});
