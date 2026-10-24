import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAbStore } from './abStore.js';
import type { AbTest } from './abTypes.js';

function makeTest(id: string, label = id, value = 'a'): AbTest {
	return {
		id,
		label,
		summary: value,
		value,
		options: [
			{ id: 'a', label: 'A', title: 'first' },
			{ id: 'b', label: 'B', title: 'second' },
		],
		onSelect: () => {},
	};
}

describe('createAbStore', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('starts empty and registers a test for its owner', () => {
		const store = createAbStore();
		expect(store.getSnapshot()).toEqual([]);

		const owner = Symbol('owner');
		const test = makeTest('tab');
		expect(store.set(owner, test, 'sig')).toBe(true);
		expect(store.getSnapshot()).toEqual([test]);
	});

	it('notifies subscribers on every change and stops after unsubscribe', () => {
		const store = createAbStore();
		const listener = vi.fn();
		const unsubscribe = store.subscribe(listener);
		const owner = Symbol('owner');

		store.set(owner, makeTest('tab'), 'sig');
		expect(listener).toHaveBeenCalledTimes(1);
		store.remove(owner, 'tab');
		expect(listener).toHaveBeenCalledTimes(2);

		unsubscribe();
		store.set(owner, makeTest('tab'), 'sig');
		expect(listener).toHaveBeenCalledTimes(2);
	});

	it('keeps the same snapshot object until something changes', () => {
		const store = createAbStore();
		const owner = Symbol('owner');
		store.set(owner, makeTest('tab'), 'sig');
		const snapshot = store.getSnapshot();
		expect(store.getSnapshot()).toBe(snapshot);

		// A no-op removal publishes nothing.
		store.remove(Symbol('stranger'), 'tab');
		store.remove(owner, 'unknown');
		expect(store.getSnapshot()).toBe(snapshot);
	});

	it('refreshes the test of the same owner, even when its declaration changed', () => {
		const store = createAbStore();
		const owner = Symbol('owner');
		store.set(owner, makeTest('tab', 'Tab', 'a'), 'sig-1');
		const result = store.set(owner, makeTest('tab', 'Tab renamed', 'b'), 'sig-2');

		expect(result).toBe(true);
		expect(store.getSnapshot()).toHaveLength(1);
		expect(store.getSnapshot()[0]).toMatchObject({ label: 'Tab renamed', value: 'b' });
	});

	it('refuses, and reports, a different test under an id another owner already uses', () => {
		const store = createAbStore();
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const first = makeTest('tab', 'First');
		store.set(Symbol('one'), first, 'sig-first');

		const refused = store.set(Symbol('two'), makeTest('tab', 'Second'), 'sig-second');

		expect(refused).toBe(false);
		expect(store.getSnapshot()).toEqual([first]);
		expect(error).toHaveBeenCalledTimes(1);
		expect(error.mock.calls[0]![0]).toContain('"tab"');
		expect(error.mock.calls[0]![0]).toContain('"First"');
		expect(error.mock.calls[0]![0]).toContain('"Second"');
	});

	it('lets identical declarations share one row, which lives until its last owner leaves', () => {
		const store = createAbStore();
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const one = Symbol('one');
		const two = Symbol('two');

		expect(store.set(one, makeTest('tab'), 'sig')).toBe(true);
		expect(store.set(two, makeTest('tab'), 'sig')).toBe(true);
		expect(store.getSnapshot()).toHaveLength(1);
		expect(error).not.toHaveBeenCalled();

		store.remove(one, 'tab');
		expect(store.getSnapshot()).toHaveLength(1);
		store.remove(two, 'tab');
		expect(store.getSnapshot()).toEqual([]);
	});

	it('does not let a non-owner remove a row', () => {
		const store = createAbStore();
		const owner = Symbol('owner');
		store.set(owner, makeTest('tab'), 'sig');
		store.remove(Symbol('stranger'), 'tab');
		expect(store.getSnapshot()).toHaveLength(1);
	});

	it('lists tests in registration order', () => {
		const store = createAbStore();
		const owner = Symbol('owner');
		store.set(owner, makeTest('b'), 'sig-b');
		store.set(owner, makeTest('a'), 'sig-a');
		expect(store.getSnapshot().map(t => t.id)).toEqual(['b', 'a']);
	});
});
