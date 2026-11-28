import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ButtonAction } from './controls/ButtonAction.js';
import { Text } from './display/Text.js';
import { Progress } from './display/Progress.js';
import { Dialog } from './overlay/Dialog.js';
import { FieldReadOnly } from './form/FieldReadOnly.js';
import { DataTable } from './table/DataTable.js';

describe('Text', () => {
	it('renders inline, so it can sit in a sentence', () => {
		render(<Text text="hello" />);
		expect(screen.getByText('hello').tagName).toBe('SPAN');
	});

	it('muted tone uses the muted token', () => {
		render(<Text text="hint" tone="muted" />);
		expect(screen.getByText('hint').className).toContain('text-muted');
	});

	it('mono switches to the monospace font', () => {
		render(<Text text="a1b2c3" mono />);
		expect(screen.getByText('a1b2c3').className).toContain('font-mono');
	});

	it('size xs is smaller than the default', () => {
		render(<Text text="tiny" size="xs" />);
		expect(screen.getByText('tiny').className).toContain('text-xs');
	});
});

describe('ButtonAction autoFocus', () => {
	it('marks the button for the dialog initial focus', () => {
		render(<ButtonAction label="Save" autoFocus />);
		expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('data-autofocus');
	});

	it('does not mark it by default', () => {
		render(<ButtonAction label="Save" />);
		expect(screen.getByRole('button', { name: 'Save' })).not.toHaveAttribute('data-autofocus');
	});
});

describe('Dialog', () => {
	it('keeps a tall body inside the viewport and scrolls it', () => {
		render(
			<Dialog title="T" open onOpenChange={() => {}}>
				<p>body</p>
			</Dialog>,
		);
		const dialog = screen.getByRole('dialog');
		expect(dialog.className).toContain('max-h-full');
		expect(dialog.className).toContain('flex-col');
		expect(screen.getByText('body').parentElement?.className).toContain('overflow-y-auto');
	});

	it('shows titleContent in the heading while title stays the name', () => {
		render(
			<Dialog title="Run abc" titleContent={<span data-testid="rich">Run <code>abc</code></span>} open onOpenChange={() => {}}>
				<p>body</p>
			</Dialog>,
		);
		expect(screen.getByTestId('rich')).toBeInTheDocument();
		expect(screen.getByRole('dialog', { name: /Run abc/ })).toBeInTheDocument();
	});

	it('focuses the footer button marked autoFocus', async () => {
		render(
			<Dialog title="T" open onOpenChange={() => {}} actions={<ButtonAction label="Confirm" autoFocus />}>
				<input aria-label="First" />
			</Dialog>,
		);
		await waitFor(() => expect(screen.getByRole('button', { name: 'Confirm' })).toHaveFocus());
	});
});

describe('Progress aria-valuetext', () => {
	it('exposes valueLabel to assistive technology', () => {
		render(<Progress value={99.94} valueLabel="99.94% available" />);
		expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '99.94% available');
	});

	it('has no valuetext without a valueLabel', () => {
		render(<Progress value={40} />);
		expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuetext');
	});
});

describe('FieldReadOnly without a ToastProvider', () => {
	it('renders instead of throwing', () => {
		render(<FieldReadOnly label="Id" value="abc" copyable />);
		expect(screen.getByText('abc')).toBeInTheDocument();
	});
});

describe('DataTable data-row-key', () => {
	it('puts the row key on each row for tests', () => {
		render(
			<DataTable
				columns={[{ key: 'id', label: 'Id', render: (r: { id: string }) => r.id }]}
				rows={[{ id: 'a1' }, { id: 'b2' }]}
				rowKey="id"
			/>,
		);
		expect(document.querySelector('tr[data-row-key="a1"]')).not.toBeNull();
		expect(document.querySelector('tr[data-row-key="b2"]')).not.toBeNull();
	});
});
