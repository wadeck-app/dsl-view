import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { DataTableFilterCtx } from './DataTable.js';
import { usePersistedFilter } from './usePersistedFilter.js';

type Persist = (value: unknown) => void;

function Harness({ tableId, currentValue, onPersist }: { tableId: string | undefined; currentValue: unknown; onPersist: (persist: Persist) => void }) {
	const persist = usePersistedFilter(tableId, 'status', currentValue);
	onPersist(persist);
	const location = useLocation();
	return <span data-testid="search">{location.search}</span>;
}

function setup(options: { search?: string; tableId?: string | undefined; currentValue?: unknown; withContext?: boolean } = {}) {
	const { search = '', currentValue = 'all', withContext = true } = options;
	// `tableId: undefined` must mean "no table", so a destructuring default (which also fires for undefined) cannot be used.
	const tableId = 'tableId' in options ? options.tableId : 't1';
	const setFilter = vi.fn();
	let persist: Persist = () => undefined;
	const ctxValue = { filters: {}, setFilter, registerFilterPredicate: vi.fn(), tableId };
	const harness = <Harness tableId={tableId} currentValue={currentValue} onPersist={p => { persist = p; }} />;
	render(
		<MemoryRouter initialEntries={[`/page${search}`]}>
			{withContext ? <DataTableFilterCtx.Provider value={ctxValue as never}>{harness}</DataTableFilterCtx.Provider> : harness}
		</MemoryRouter>
	);
	return { setFilter, persist: (value: unknown) => act(() => persist(value)), search: () => screen.getByTestId('search').textContent };
}

describe('usePersistedFilter seeding on mount', () => {
	it('restores a single value from the "<tableId>_<filterKey>" URL param', () => {
		const { setFilter } = setup({ search: '?t1_status=failed' });

		expect(setFilter).toHaveBeenCalledTimes(1);
		expect(setFilter).toHaveBeenCalledWith('status', 'failed');
	});

	it('restores a comma-separated param as a list, dropping empty parts', () => {
		const { setFilter } = setup({ search: '?t1_status=failed,,done' });

		expect(setFilter).toHaveBeenCalledWith('status', ['failed', 'done']);
	});

	it('without the param, seeds the filter with the current value so the table and the control agree', () => {
		const { setFilter } = setup({ currentValue: 'pending' });

		expect(setFilter).toHaveBeenCalledWith('status', 'pending');
	});

	it('ignores the param of another table, and does not touch the filter at all without a table id', () => {
		const other = setup({ search: '?t2_status=failed', currentValue: 'all' });
		expect(other.setFilter).toHaveBeenCalledWith('status', 'all');

		const noTable = setup({ search: '?t1_status=failed', tableId: undefined });
		expect(noTable.setFilter).not.toHaveBeenCalled();
	});
});

describe('usePersistedFilter persist()', () => {
	it('updates the table filter and writes the value to the URL, keeping the other params', () => {
		const t = setup({ search: '?q=abc' });
		t.setFilter.mockClear();

		t.persist('failed');

		expect(t.setFilter).toHaveBeenCalledWith('status', 'failed');
		expect(new URLSearchParams(t.search()!).get('t1_status')).toBe('failed');
		expect(new URLSearchParams(t.search()!).get('q')).toBe('abc');
	});

	it('writes a list as a comma-separated param', () => {
		const t = setup();

		t.persist(['failed', 'done']);

		expect(new URLSearchParams(t.search()!).get('t1_status')).toBe('failed,done');
	});

	it('a single value that contains a comma stays one value through the URL and back (it used to come back as a list)', () => {
		const written = setup();
		written.persist('Smith, John');
		const url = written.search()!;
		expect(new URLSearchParams(url).get('t1_status')).toBe('Smith%2C John');

		const restored = setup({ search: url });

		expect(restored.setFilter).toHaveBeenCalledWith('status', 'Smith, John');
	});

	it('a list whose items contain commas or percent signs round-trips item by item', () => {
		const written = setup();
		written.persist(['a,b', '50%', 'c']);

		const restored = setup({ search: written.search()! });

		expect(restored.setFilter).toHaveBeenCalledWith('status', ['a,b', '50%', 'c']);
	});

	it.each([[null], [undefined], ['all'], [[]]])('removes the param when the value is the "cleared" value %j', cleared => {
		const t = setup({ search: '?t1_status=failed&q=abc' });

		t.persist(cleared);

		const params = new URLSearchParams(t.search()!);
		expect(params.has('t1_status')).toBe(false);
		expect(params.get('q')).toBe('abc');
	});

	it('keeps falsy-but-meaningful values: 0 and false are written, not treated as cleared', () => {
		const t = setup();

		t.persist(0);
		expect(new URLSearchParams(t.search()!).get('t1_status')).toBe('0');

		t.persist(false);
		expect(new URLSearchParams(t.search()!).get('t1_status')).toBe('false');
	});

	it('without a table id it still updates the filter but writes nothing to the URL', () => {
		const t = setup({ tableId: undefined });

		t.persist('failed');

		expect(t.setFilter).toHaveBeenCalledWith('status', 'failed');
		expect(t.search()).toBe('');
	});

	it('outside a DataTable (no filter context) it only writes the URL and does not throw', () => {
		const t = setup({ withContext: false });

		expect(() => t.persist('failed')).not.toThrow();
		expect(new URLSearchParams(t.search()!).get('t1_status')).toBe('failed');
	});
});
