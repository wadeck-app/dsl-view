import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DataTable } from './DataTable.js';
import type { TableColumn } from './DataTable.js';

type Row = Record<string, unknown>;

// What GenericPageRunner hands to DataTable: the raw YAML maps, not ColumnHelpers objects.
const yamlColumns = (cols: Array<Record<string, unknown>>) => cols as unknown as TableColumn<Row>[];

const rows: Row[] = [
	{ id: '1', name: 'first', retryable: true },
	{ id: '2', name: 'second', retryable: false },
];

const iconOf = (button: HTMLElement) => button.querySelector('svg');

afterEach(() => {
	vi.restoreAllMocks();
});

describe('DataTable actions column: `icon` authored in YAML', () => {
	const columns = yamlColumns([
		{ field: 'name', label: 'Name' },
		{ type: 'actions', items: [{ label: 'Push test event', action: 'push', icon: 'rocket', variant: 'danger-outline' }] },
	]);

	it('renders an icon-only button named by its label, with the label as tooltip', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		render(<DataTable rows={rows} columns={columns} />);
		const buttons = screen.getAllByRole('button', { name: 'Push test event' });
		expect(buttons).toHaveLength(2);
		for (const button of buttons) {
			expect(button.getAttribute('title')).toBe('Push test event');
			// icon-only: the label is the name, not visible text
			expect(button.textContent).toBe('');
			expect(iconOf(button)?.getAttribute('class')).toContain('lucide-rocket');
			expect(iconOf(button)?.getAttribute('aria-hidden')).toBe('true');
		}
		// the text-button fallback (and its warning) is for items WITHOUT an icon
		expect(warn).not.toHaveBeenCalled();
	});

	it('calls the action with the row of the clicked button', async () => {
		const onAction = vi.fn();
		render(<DataTable rows={rows} columns={columns} onAction={onAction} />);
		await userEvent.click(screen.getAllByRole('button', { name: 'Push test event' })[1]!);
		expect(onAction).toHaveBeenCalledTimes(1);
		expect(onAction).toHaveBeenCalledWith('push', rows[1]);
	});

	it('is activated from the keyboard (Enter and Space), once each', async () => {
		const onAction = vi.fn();
		render(<DataTable rows={[rows[0]!]} columns={columns} onAction={onAction} />);
		const button = screen.getByRole('button', { name: 'Push test event' });
		await userEvent.tab();
		expect(document.activeElement).toBe(button);
		await userEvent.keyboard('{Enter}');
		expect(onAction).toHaveBeenCalledTimes(1);
		await userEvent.keyboard(' ');
		expect(onAction).toHaveBeenCalledTimes(2);
	});

	it('keeps the variant of the item (it is not the default ghost look)', () => {
		const plain = yamlColumns([{ type: 'actions', items: [{ label: 'Plain', action: 'a', icon: 'rocket' }] }]);
		const { unmount } = render(<DataTable rows={[rows[0]!]} columns={plain} />);
		const plainClass = screen.getByRole('button', { name: 'Plain' }).className;
		unmount();
		render(<DataTable rows={[rows[0]!]} columns={columns} />);
		expect(screen.getByRole('button', { name: 'Push test event' }).className).not.toBe(plainClass);
	});

	it('hides the button of a row whose condition is false, and keeps it for the others', () => {
		const conditional = yamlColumns([
			{ type: 'actions', items: [{ label: 'Retry now', action: 'retry', icon: 'rotate-ccw', condition: 'retryable' }] },
		]);
		render(<DataTable rows={rows} columns={conditional} />);
		const buttons = screen.getAllByRole('button', { name: 'Retry now' });
		expect(buttons).toHaveLength(1);
		// the surviving button belongs to row 1 (retryable), not row 2
		const bodyRows = screen.getAllByRole('row').slice(1);
		expect(bodyRows[0]!.querySelector('button')).not.toBeNull();
		expect(bodyRows[1]!.querySelector('button')).toBeNull();
	});

	it('shows a spinner instead of the icon, disabled and aria-busy, only on the row in flight', () => {
		render(<DataTable rows={rows} columns={columns} actionPendingRows={{ push: ['2'] }} />);
		const [first, second] = screen.getAllByRole('button', { name: 'Push test event' });
		expect(second!.hasAttribute('disabled')).toBe(true);
		expect(second!.getAttribute('aria-busy')).toBe('true');
		expect(iconOf(second!)?.getAttribute('class')).toContain('animate-spin');
		expect(iconOf(second!)?.getAttribute('class')).not.toContain('lucide-rocket');
		expect(first!.hasAttribute('disabled')).toBe(false);
		expect(first!.getAttribute('aria-busy')).toBeNull();
		expect(iconOf(first!)?.getAttribute('class')).toContain('lucide-rocket');
	});

	it('names an unknown icon with the supported ones, and still renders a usable button', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const onAction = vi.fn();
		const typo = yamlColumns([{ type: 'actions', items: [{ label: 'Push', action: 'push', icon: 'rockett' }] }]);
		render(<DataTable rows={[rows[0]!]} columns={typo} onAction={onAction} />);
		const message = error.mock.calls.map(call => String(call[0])).find(text => text.includes('unknown icon "rockett"'));
		expect(message).toContain('actions column #0, item #0');
		expect(message).toContain('Supported icons:');
		expect(message).toContain('rocket');
		const button = screen.getByRole('button', { name: 'Push' });
		expect(iconOf(button)?.getAttribute('class')).toContain('lucide-external-link');
		await userEvent.click(button);
		expect(onAction).toHaveBeenCalledWith('push', rows[0]);
	});

	it('leaves a React node icon of a hand-built action untouched', () => {
		const handBuilt = [
			{ key: 'name', label: 'Name', render: (row: Row) => String(row['name']) },
			{
				key: '_actions',
				label: '',
				isActions: true,
				render: () => null,
				actions: [{ label: 'Custom', action: 'custom', icon: <span data-testid="custom-icon">!</span> }],
			},
		] as TableColumn<Row>[];
		render(<DataTable rows={[rows[0]!]} columns={handBuilt} />);
		expect(screen.getByTestId('custom-icon').closest('button')?.getAttribute('aria-label')).toBe('Custom');
	});

	it('accepts `icon` without an unknown-key error, and still rejects a real typo', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const withTypo = yamlColumns([{ type: 'actions', items: [{ label: 'Go', action: 'go', icon: 'play', icn: 'play' }] }]);
		render(<DataTable rows={[rows[0]!]} columns={withTypo} />);
		const texts = error.mock.calls.map(call => String(call[0]));
		expect(texts.some(text => text.includes('unknown key "icon"'))).toBe(false);
		expect(texts.some(text => text.includes('item #0: unknown key "icn" is ignored'))).toBe(true);
		expect(texts.find(text => text.includes('"icn"'))).toContain('icon');
	});
});
