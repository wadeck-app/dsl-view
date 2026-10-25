// `fill`: the table takes the height of its dashboard tile and scrolls its rows inside it. jsdom has no layout engine,
// so these tests pin the structure the layout relies on (which element scrolls, what stays outside it, what sticks);
// the real heights are measured in a browser (DataTable fill stories).
import { render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FILL_CLASSES } from '@dsl-ui/utils/fillClasses.js';
import { ColumnHelpers, DataTable } from './DataTable.js';

type Row = { id: string; name: string };

const cols = [ColumnHelpers.text<Row>('name', 'Name')];
const rows: Row[] = [{ id: '1', name: 'Alpha' }, { id: '2', name: 'Beta' }];
const FILL = FILL_CLASSES.split(' ');

afterEach(() => {
	vi.restoreAllMocks();
});

/** The root element of the table: the box with the border. */
function root(container: HTMLElement): HTMLElement {
	return container.firstElementChild as HTMLElement;
}

/** The box around the <table>: the one that scrolls when `fill` is on. */
function scrollBox(container: HTMLElement): HTMLElement {
	return container.querySelector('table')!.parentElement as HTMLElement;
}

/** Makes every element report a content taller than its box (what a long table inside a short tile looks like). */
function overflowing(): void {
	vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(500);
	vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(100);
}

describe('DataTable fill', () => {
	it('without fill nothing changes: the root scrolls horizontally, takes no tile height and has no scroll region', () => {
		const { container } = render(<DataTable rows={rows} columns={cols} />);
		expect(root(container)).toHaveClass('overflow-x-auto');
		FILL.forEach(name => expect(root(container)).not.toHaveClass(name));
		expect(root(container)).not.toHaveClass('flex-col');
		expect(scrollBox(container)).not.toHaveClass('overflow-auto');
		expect(screen.queryByRole('region')).toBeNull();
		screen.getAllByRole('columnheader').forEach(th => expect(th).not.toHaveClass('sticky'));
	});

	it('fill takes the tile height as a column whose only scrolling child is the box around the rows', () => {
		const { container } = render(<DataTable fill rows={rows} columns={cols} />);
		FILL.forEach(name => expect(root(container)).toHaveClass(name));
		expect(root(container)).toHaveClass('flex', 'flex-col', 'overflow-hidden');
		expect(root(container)).not.toHaveClass('overflow-x-auto');
		expect(scrollBox(container)).toHaveClass('min-h-0', 'flex-1', 'overflow-auto');
		expect(container.querySelector('table')!.parentElement!.parentElement).toBe(root(container));
	});

	it('only the boolean true switches it on', () => {
		const { container } = render(<DataTable fill={'yes' as unknown as boolean} rows={rows} columns={cols} />);
		FILL.forEach(name => expect(root(container)).not.toHaveClass(name));
		expect(root(container)).toHaveClass('overflow-x-auto');
		expect(scrollBox(container)).not.toHaveClass('overflow-auto');
	});

	it('keeps the header row on screen: every header cell sticks to the top of the scroll box', () => {
		render(<DataTable fill selectable rows={rows} columns={cols} expansion={{ $type: 'x' }} renderNode={() => null} />);
		const headers = screen.getAllByRole('columnheader');
		// selection column + expansion column + the data column
		expect(headers).toHaveLength(3);
		headers.forEach(th => expect(th).toHaveClass('sticky', 'top-0', 'z-10', 'bg-surface'));
	});

	it('keeps the filter rows out of the scroll box at their own height', () => {
		const { container } = render(
			<DataTable fill rows={rows} columns={cols} filtersTop={<span>top filter</span>} filters={<span>bar filter</span>} />,
		);
		const top = screen.getByText('top filter').parentElement!;
		const bar = screen.getByText('bar filter').parentElement!;
		expect(top).toHaveClass('shrink-0');
		expect(bar).toHaveClass('shrink-0');
		expect(scrollBox(container).contains(top)).toBe(false);
		expect(scrollBox(container).contains(bar)).toBe(false);
		expect(root(container).contains(top)).toBe(true);
	});

	it('does not give a plain table filter rows that cannot shrink', () => {
		render(<DataTable rows={rows} columns={cols} filtersTop={<span>top filter</span>} filters={<span>bar filter</span>} />);
		expect(screen.getByText('top filter').parentElement).not.toHaveClass('shrink-0');
		expect(screen.getByText('bar filter').parentElement).not.toHaveClass('shrink-0');
	});

	it('the scroll box joins the tab order only while it scrolls, as a named region', () => {
		overflowing();
		const { container } = render(<DataTable fill rows={rows} columns={cols} />);
		const region = screen.getByRole('region', { name: 'Table rows' });
		expect(region).toBe(scrollBox(container));
		expect(region).toHaveAttribute('tabindex', '0');
		// The table itself keeps its semantics inside the region.
		expect(region.querySelector('table')).not.toBeNull();
		expect(screen.getByRole('table')).toBeInTheDocument();
		expect(screen.getAllByRole('row')).toHaveLength(3);
	});

	it('a table that fits gets no tab stop and no region', () => {
		const { container } = render(<DataTable fill rows={rows} columns={cols} />);
		expect(screen.queryByRole('region')).toBeNull();
		expect(scrollBox(container)).not.toHaveAttribute('tabindex');
	});

	it('without fill the box around the table never becomes a region, even when its content is tall', () => {
		overflowing();
		render(<DataTable rows={rows} columns={cols} />);
		expect(screen.queryByRole('region')).toBeNull();
	});

	it('an empty result takes the room under the header so its message sits in the middle of it', () => {
		const { container } = render(<DataTable fill rows={[]} columns={cols} emptyMessage="Nothing here" />);
		expect(container.querySelector('table')).toHaveClass('h-full');
		const emptyRow = screen.getByText('Nothing here').closest('tr')!;
		expect(emptyRow).toHaveClass('h-full');
		// A tall 64px margin would eat a short tile.
		expect(screen.getByText('Nothing here')).toHaveClass('py-6');
		expect(screen.getByText('Nothing here')).not.toHaveClass('py-16');
	});

	it('a plain empty table keeps its tall empty state and an auto-height table', () => {
		const { container } = render(<DataTable rows={[]} columns={cols} emptyMessage="Nothing here" />);
		expect(container.querySelector('table')).not.toHaveClass('h-full');
		expect(screen.getByText('Nothing here')).toHaveClass('py-16');
	});

	it('the skeleton rows stay inside the scroll box under the sticky header and are clipped, not scrolled', () => {
		overflowing();
		const { container } = render(<DataTable fill loading rows={[]} columns={cols} />);
		expect(scrollBox(container).querySelectorAll('tbody tr')).toHaveLength(5);
		// Five placeholder rows can be taller than a small tile: they are cut off instead of adding a scrollbar and a tab stop to a loading state.
		expect(scrollBox(container)).toHaveClass('overflow-hidden');
		expect(scrollBox(container)).not.toHaveClass('overflow-auto');
		expect(screen.queryByRole('region')).toBeNull();
		expect(screen.getByRole('status')).toHaveTextContent('Loading');
		expect(container.querySelector('table')).not.toHaveClass('h-full');
		screen.getAllByRole('columnheader').forEach(th => expect(th).toHaveClass('sticky'));
	});

	it('a bottom batch bar stays below the scroll box at its own height', async () => {
		const { container } = render(
			<DataTable fill selectable rows={rows} columns={cols} batchActions={[{ label: 'Delete', action: 'delete' }]} batchActionsPosition="bottom" />,
		);
		screen.getByRole('checkbox', { name: 'Select row 1' }).click();
		const bar = await screen.findByRole('toolbar', { name: 'Batch actions' });
		expect(bar).toHaveClass('shrink-0');
		expect(scrollBox(container).contains(bar)).toBe(false);
		expect(bar.parentElement).toBe(root(container));
	});

	it('the floating batch bar is not affected by fill', async () => {
		render(<DataTable fill selectable rows={rows} columns={cols} batchActions={[{ label: 'Delete', action: 'delete' }]} />);
		screen.getByRole('checkbox', { name: 'Select row 1' }).click();
		const bar = await screen.findByRole('toolbar', { name: 'Batch actions' });
		expect(bar).toHaveClass('fixed');
		expect(bar).not.toHaveClass('shrink-0');
	});
});
