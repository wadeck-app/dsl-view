import { fireEvent, render, screen } from '@testing-library/react';
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

// Helper: render menu already open (avoids Radix focus-trap setTimeout chain)
function renderOpenMenu(items = defaultItems, props: Record<string, unknown> = {}) {
	return render(
		<ContextMenu
			trigger={<button>Menu</button>}
			items={items}
			open={true}
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

	// Pattern B: verify click signals open intent via onOpenChange
	it('opens on trigger click', () => {
		const onOpenChange = vi.fn();
		renderMenu(defaultItems, { onOpenChange });
		fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
		expect(onOpenChange).toHaveBeenCalledWith(true);
	});

	// Pattern A: render already-open to check items
	it('renders all menu items when open', () => {
		renderOpenMenu();
		expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
		expect(screen.getByRole('menuitem', { name: 'Duplicate' })).toBeInTheDocument();
		expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
	});

	// Pattern A: render already-open to check role
	it('menu has role="menu"', () => {
		renderOpenMenu();
		expect(screen.getByRole('menu')).toBeInTheDocument();
	});

	// Pattern A: render already-open, then click item
	it('clicking an item calls its onClick handler', () => {
		const onEdit = vi.fn();
		const items: ContextMenuItem[] = [{ label: 'Edit', onClick: onEdit }];
		render(<ContextMenu trigger={<button>Menu</button>} items={items} open={true} />);
		fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
		expect(onEdit).toHaveBeenCalledOnce();
	});

	// Pattern A: render already-open, click item, verify close is signalled
	it('clicking an item closes the menu', () => {
		const onOpenChange = vi.fn();
		renderOpenMenu(defaultItems, { onOpenChange });
		fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	// Pattern A: render already-open to check disabled attribute
	it('disabled item has disabled attribute', () => {
		const items: ContextMenuItem[] = [
			{ label: 'Active', onClick: vi.fn() },
			{ label: 'Disabled', onClick: vi.fn(), disabled: true },
		];
		render(<ContextMenu trigger={<button>Menu</button>} items={items} open={true} />);
		expect(screen.getByRole('menuitem', { name: 'Disabled' })).toBeDisabled();
	});

	// Pattern A: render already-open, click disabled item
	it('clicking a disabled item does not call onClick', () => {
		const onDisabledClick = vi.fn();
		const items: ContextMenuItem[] = [
			{ label: 'Disabled', onClick: onDisabledClick, disabled: true },
		];
		render(<ContextMenu trigger={<button>Menu</button>} items={items} open={true} />);
		fireEvent.click(screen.getByRole('menuitem', { name: 'Disabled' }));
		expect(onDisabledClick).not.toHaveBeenCalled();
	});

	// Pattern A: render already-open to check separator
	it('separator item renders a separator element', () => {
		const items: ContextMenuItem[] = [
			{ label: 'Edit', onClick: vi.fn() },
			{ label: '', separator: true, onClick: vi.fn() },
			{ label: 'Delete', onClick: vi.fn(), danger: true },
		];
		render(<ContextMenu trigger={<button>Menu</button>} items={items} open={true} />);
		expect(screen.getByTestId('menu-separator')).toBeInTheDocument();
	});

	// Pattern A: render already-open to check data-danger
	it('danger item has data-danger attribute', () => {
		const items: ContextMenuItem[] = [
			{ label: 'Delete', onClick: vi.fn(), danger: true },
		];
		render(<ContextMenu trigger={<button>Menu</button>} items={items} open={true} />);
		const deleteItem = screen.getByRole('menuitem', { name: 'Delete' });
		expect(deleteItem).toHaveAttribute('data-danger', 'true');
	});

	// Pattern A: render already-open to check absence of data-danger
	it('non-danger item does not have data-danger attribute', () => {
		const items: ContextMenuItem[] = [{ label: 'Edit', onClick: vi.fn() }];
		render(<ContextMenu trigger={<button>Menu</button>} items={items} open={true} />);
		const editItem = screen.getByRole('menuitem', { name: 'Edit' });
		expect(editItem).not.toHaveAttribute('data-danger');
	});

	// Pattern C: render already-open, Escape signals close via onOpenChange
	it('pressing Escape closes the menu', () => {
		const onOpenChange = vi.fn();
		renderOpenMenu(defaultItems, { onOpenChange });
		expect(screen.getByTestId('context-menu-content')).toBeInTheDocument();
		fireEvent.keyDown(document.activeElement || document.body, { key: 'Escape' });
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	// Pattern A: render already-open to check icon
	it('icon is rendered when provided', () => {
		const items: ContextMenuItem[] = [
			{
				label: 'With Icon',
				icon: <span data-testid="test-icon">★</span>,
				onClick: vi.fn(),
			},
		];
		render(<ContextMenu trigger={<button>Menu</button>} items={items} open={true} />);
		expect(screen.getByTestId('test-icon')).toBeInTheDocument();
	});

	// Pattern A: render already-open, test Arrow Down keyboard navigation
	it('Arrow Down moves focus to next focusable item', () => {
		const items: ContextMenuItem[] = [
			{ label: 'First', onClick: vi.fn() },
			{ label: 'Second', onClick: vi.fn() },
			{ label: 'Third', onClick: vi.fn() },
		];
		render(<ContextMenu trigger={<button>Menu</button>} items={items} open={true} />);
		const firstItem = screen.getByRole('menuitem', { name: 'First' });
		firstItem.focus();
		fireEvent.keyDown(firstItem, { key: 'ArrowDown' });
		expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Second' }));
	});
});
