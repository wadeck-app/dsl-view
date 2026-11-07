import { afterEach, describe, expect, it, vi } from 'vitest';

import { announceStoredValue, subscribeToStoredValue } from './storageSubscription.js';

const fromOtherTab = (init: StorageEventInit) => window.dispatchEvent(new StorageEvent('storage', { storageArea: localStorage, ...init }));

describe('subscribeToStoredValue', () => {
	const stops: Array<() => void> = [];
	afterEach(() => {
		stops.splice(0).forEach(stop => stop());
	});
	const follow = (key: string, apply: (v: string) => void) => {
		const stop = subscribeToStoredValue(key, apply);
		stops.push(stop);
		return stop;
	};

	it('passes on the value another tab stored under the key', () => {
		const apply = vi.fn();
		follow('k', apply);
		fromOtherTab({ key: 'k', newValue: 'x' });
		expect(apply).toHaveBeenCalledExactlyOnceWith('x');
	});

	it.each([
		['another key', { key: 'other', newValue: 'x' }],
		['a removal', { key: 'k', newValue: null }],
	])('ignores %s', (_name, init) => {
		const apply = vi.fn();
		follow('k', apply);
		fromOtherTab(init);
		expect(apply).not.toHaveBeenCalled();
	});

	it('ignores another storage area', () => {
		const apply = vi.fn();
		follow('k', apply);
		window.dispatchEvent(new StorageEvent('storage', { key: 'k', newValue: 'x', storageArea: sessionStorage }));
		expect(apply).not.toHaveBeenCalled();
	});

	it('announces a value of this tab to every follower of the key, and only to them', () => {
		const first = vi.fn();
		const second = vi.fn();
		const other = vi.fn();
		follow('k', first);
		follow('k', second);
		follow('o', other);
		announceStoredValue('k', 'y');
		expect(first).toHaveBeenCalledExactlyOnceWith('y');
		expect(second).toHaveBeenCalledExactlyOnceWith('y');
		expect(other).not.toHaveBeenCalled();
	});

	it('stops on the returned function, and the others of the key keep following', () => {
		const first = vi.fn();
		const second = vi.fn();
		const stopFirst = follow('k', first);
		follow('k', second);
		stopFirst();
		fromOtherTab({ key: 'k', newValue: 'x' });
		announceStoredValue('k', 'y');
		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledTimes(2);
	});

	it('removes the window listener it added', () => {
		const added = vi.spyOn(window, 'addEventListener');
		const removed = vi.spyOn(window, 'removeEventListener');
		subscribeToStoredValue('k', () => {})();
		const handler = added.mock.calls.find(([type]) => type === 'storage')![1];
		expect(removed).toHaveBeenCalledWith('storage', handler);
	});
});
