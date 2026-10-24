import { describe, expect, it } from 'vitest';
import { colorFromId, initialsOf } from './initials.js';

// Built from a code point so the file holds no emoji literal.
const ROCKET = String.fromCodePoint(0x1f680);

describe('initialsOf', () => {
	it('uses the first two letters of a single word, and the first letter of the first two words otherwise', () => {
		expect(initialsOf('Queue')).toBe('QU');
		expect(initialsOf('Orchestrator')).toBe('OR');
		expect(initialsOf('Audit log')).toBe('AL');
		expect(initialsOf('Payment methods and more')).toBe('PM');
	});

	it('splits on "-" and "_" too', () => {
		expect(initialsOf('audit-log')).toBe('AL');
		expect(initialsOf('audit_log')).toBe('AL');
	});

	it('upper-cases', () => {
		expect(initialsOf('queue')).toBe('QU');
	});

	it('never cuts a character in half: emoji and other astral characters count as one letter', () => {
		expect(initialsOf(`${ROCKET} Launch`)).toBe(`${ROCKET}L`);
		expect(initialsOf(ROCKET)).toBe(ROCKET);
		expect(initialsOf(ROCKET.repeat(3))).toBe(ROCKET.repeat(2));
		expect(initialsOf(`Launch ${ROCKET}`)).toBe(`L${ROCKET}`);
		// A lower-case accented first letter comes back upper-case (written as escapes: the file holds no accented literal).
		expect(initialsOf('\u00e9lan')).toBe('\u00c9L');
	});

	it('copes with a one-letter name, extra separators and an empty name', () => {
		expect(initialsOf('X')).toBe('X');
		expect(initialsOf('  --a  b--')).toBe('AB');
		expect(initialsOf('')).toBe('?');
		expect(initialsOf('---')).toBe('?');
	});
});

describe('colorFromId', () => {
	const NINE = ['#e11d48', '#ea580c', '#d97706', '#059669', '#0d9488', '#0284c7', '#4f46e5', '#7c3aed', '#c026d3'];

	it('is stable: the same id always gets the same entry', () => {
		expect(colorFromId('queue', NINE)).toBe(colorFromId('queue', NINE));
	});

	it('always returns an entry of the palette', () => {
		for (const id of ['', 'a', 'queue', 'orchestrator', 'audit-log', 'x'.repeat(200)]) {
			expect(NINE).toContain(colorFromId(id, NINE));
		}
	});

	it('never changes the color of an id from one release to the next (pinned indices of a 9-color palette)', () => {
		// A module keeps its color for users who learned it: changing the hash would silently recolor every tile.
		const expected: Record<string, number> = {
			queue: 8,
			orchestrator: 4,
			billing: 5,
			inventory: 4,
			reports: 3,
			'audit-log': 6,
			settings: 5,
			a: 0,
			'': 5,
			task: 7,
			flow: 3,
			'app-core': 7,
		};
		for (const [id, index] of Object.entries(expected)) {
			expect(NINE.indexOf(colorFromId(id, NINE)), id).toBe(index);
		}
	});

	it('spreads short ids over several entries (a plain hash * 31 sent half of them to one)', () => {
		const ids = ['queue', 'orchestrator', 'billing', 'inventory', 'reports', 'audit-log', 'settings'];
		expect(new Set(ids.map((id) => colorFromId(id, NINE))).size).toBeGreaterThan(3);
	});

	it('follows the palette it is given', () => {
		expect(colorFromId('queue', ['only'])).toBe('only');
		expect(['a', 'b']).toContain(colorFromId('queue', ['a', 'b']));
	});

	it('fails loudly on an empty palette instead of returning undefined', () => {
		expect(() => colorFromId('queue', [])).toThrow(/non-empty palette/);
	});
});
