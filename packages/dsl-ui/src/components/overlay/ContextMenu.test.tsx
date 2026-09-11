import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ContextMenu } from './ContextMenu.js';
import type { ContextMenuItem } from './ContextMenu.js';

const defaultItems: ContextMenuItem[] = [
	{ label: 'Edit', onClick: vi.fn() },
	{ label: 'Duplicate', onClick: vi.fn() },
	{ label: 'Delete', onClick: vi.fn(), danger: true },
];

function renderMenu(items = defaultItems, props = {}) {
	return render(
		<ContextMenu
			trigger={<button>Menu</button>}
			items={items}
			{...props}
		/>
	);
}

describe('ContextMenu', () => {
	it('renders the trigger element', () => {
		renderMenu();
		expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
	});

	it('menu is not visible initially', () => {
		renderMenu();
		expect(screen.queryByTestId('context-menu-content')).not.toBeInTheDocument();
	});

	it('opens on trigger click', async () => {
		const user = userEvent.setup();
		renderMenu();
		await user.click(screen.getByRole('button', { name: 'Menu' }));
		expect(screen.getByTestId('context-menu-content')).toBeInTheDocument();
	});

	it('renders all menu items when open', async () => {
		const user = userEvent.setup();
		renderMenu();
		await user.click(screen.getByRole('button', { name: 'Menu' }));
		expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
		expect(screen.getByRole('menuitem', { name: 'Duplicate' })).toBeInTheDocument();
		expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
	});

	it('menu has role="menu"', async () => {
		const user = userEvent.setup();
		renderMenu();
		await user.click(screen.getByRole('button', { name: 'Menu' }));
		expect(screen.getByRole('menu')).toBeInTheDocument();
	});

	it('clicking an item calls its onClick handler', async () => {
		const user = userEvent.setup();
		const onEdit = vi.fn();
		const items: ContextMenuItem[] = [{ label: 'Edit', onClick: onEdit }];
		render(<ContextMenu trigger={<button>Menu</button>} items={items} />);
		await user.click(screen.getByRole('button', { name: 'Menu' }));
		await user.click(screen.getByRole('menuitem', { name: 'Edit' }));
		expect(onEdit).toHaveBeenCalledOnce();
	});

	it('clicking an item closes the menu', async () => {
		const user = userEvent.setup();
		renderMenu();
		await user.click(screen.getByRole('button', { name: 'Menu' }));
		await user.click(screen.getByRole('menuitem', { name: 'Edit' }));
		expect(screen.queryByTestId('context-menu-content')).not.toBeInTheDocument();
	});

	it('disabled item has disabled attribute', async () => {
		const user = userEvent.setup();
		const items: ContextMenuItem[] = [
			{ label: 'Active', onClick: vi.fn() },
			{ label: 'Disabled', onClick: vi.fn(), disabled: true },
		];
		render(<ContextMenu trigger={<button>Menu</button>} items={items} />);
		await user.click(screen.getByRole('button', { name: 'Menu' }));
		expect(screen.getByRole('menuitem', { name: 'Disabled' })).toBeDisabled();
	});

	it('clicking a disabled item does not call onClick', async () => {
		const user = userEvent.setup();
		const onDisabledClick = vi.fn();
		const items: ContextMenuItem[] = [
			{ label: 'Disabled', onClick: onDisabledClick, disabled: true },
		];
		render(<ContextMenu trigger={<button>Menu</button>} items={items} />);
		await user.click(screen.getByRole('button', { name: 'Menu' }));
		await user.click(screen.getByRole('menuitem', { name: 'Disabled' }));
		expect(onDisabledClick).not.toHaveBeenCalled();
	});

	it('separator item renders a separator element', async () => {
		const user = userEvent.setup();
		const items: ContextMenuItem[] = [
			{ label: 'Edit', onClick: vi.fn() },
			{ label: '', separator: true, onClick: vi.fn() },
			{ label: 'Delete', onClick: vi.fn(), danger: true },
		];
		render(<ContextMenu trigger={<button>Menu</button>} items={items} />);
		await user.click(screen.getByRole('button', { name: 'Menu' }));
		expect(screen.getByTestId('menu-separator')).toBeInTheDocument();
	});

	it('danger item has data-danger attribute', async () => {
		const user = userEvent.setup();
		const items: ContextMenuItem[] = [
			{ label: 'Delete', onClick: vi.fn(), danger: true },
		];
		render(<ContextMenu trigger={<button>Menu</button>} items={items} />);
		await user.click(screen.getByRole('button', { name: 'Menu' }));
		const deleteItem = screen.getByRole('menuitem', { name: 'Delete' });
		expect(deleteItem).toHaveAttribute('data-danger', 'true');
	});

	it('non-danger item does not have data-danger attribute', async () => {
		const user = userEvent.setup();
		const items: ContextMenuItem[] = [{ label: 'Edit', onClick: vi.fn() }];
		render(<ContextMenu trigger={<button>Menu</button>} items={items} />);
		await user.click(screen.getByRole('button', { name: 'Menu' }));
		const editItem = screen.getByRole('menuitem', { name: 'Edit' });
		expect(editItem).not.toHaveAttribute('data-danger');
	});

	it('pressing Escape closes the menu', async () => {
		const user = userEvent.setup();
		renderMenu();
		await user.click(screen.getByRole('button', { name: 'Menu' }));
		expect(screen.getByTestId('context-menu-content')).toBeInTheDocument();
		await user.keyboard('{Escape}');
		expect(screen.queryByTestId('context-menu-content')).not.toBeInTheDocument();
	});

	it('icon is rendered when provided', async () => {
		const user = userEvent.setup();
		const items: ContextMenuItem[] = [
			{
				label: 'With Icon',
				icon: <span data-testid="test-icon">★</span>,
				onClick: vi.fn(),
			},
		];
		render(<ContextMenu trigger={<button>Menu</button>} items={items} />);
		await user.click(screen.getByRole('button', { name: 'Menu' }));
		expect(screen.getByTestId('test-icon')).toBeInTheDocument();
	});

	it('Arrow Down moves focus to next focusable item', async () => {
		const user = userEvent.setup();
		const items: ContextMenuItem[] = [
			{ label: 'First', onClick: vi.fn() },
			{ label: 'Second', onClick: vi.fn() },
			{ label: 'Third', onClick: vi.fn() },
		];
		render(<ContextMenu trigger={<button>Menu</button>} items={items} />);
		await user.click(screen.getByRole('button', { name: 'Menu' }));
		// First item is focused on open
		const firstItem = screen.getByRole('menuitem', { name: 'First' });
		firstItem.focus();
		await user.keyboard('{ArrowDown}');
		expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Second' }));
	});
});
