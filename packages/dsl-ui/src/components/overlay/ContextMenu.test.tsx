import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

describe('ContextMenu anchor', () => {
	// jsdom has no layout, so positioning itself can't be asserted. What can be: the element Radix
	// measures as the anchor must have a box. `display: contents` has none (rect 0,0,0,0), which
	// anchored the menu at the page's top-left corner instead of under the trigger.
	it('anchors on a wrapper that has a layout box, not display: contents', () => {
		renderMenu();
		const anchor = screen.getByRole('button', { name: 'Menu' }).parentElement as HTMLElement;
		expect(anchor.style.display).not.toBe('contents');
		expect(anchor.style.display).toBe('inline-flex');
	});
});

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

	// A real browser showed focus falling back to <body> after Escape: Radix returns focus to its Trigger,
	// which here is the non-focusable wrapper span, not the button the user activated.
	it('returns focus to the trigger button when the menu closes', async () => {
		renderMenu();
		const trigger = screen.getByRole('button', { name: 'Menu' });
		trigger.focus();
		fireEvent.click(trigger);
		const menu = await screen.findByRole('menu');
		fireEvent.keyDown(menu, { key: 'Escape' });
		await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
		expect(document.activeElement).toBe(trigger);
	});

	// The trigger button, not its wrapper, must carry the popup state for assistive technology.
	it('exposes aria-haspopup="menu" and aria-expanded on the trigger button', async () => {
		renderMenu();
		const trigger = screen.getByRole('button', { name: 'Menu' });
		expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
		expect(trigger).toHaveAttribute('aria-expanded', 'false');
		fireEvent.click(trigger);
		await screen.findByRole('menu');
		expect(trigger).toHaveAttribute('aria-expanded', 'true');
	});

	// A kebab trigger is usually a component that does not forward props: the state must still reach its button.
	it('sets the popup state on the button even when the trigger component forwards no props', async () => {
		const Kebab = () => <button aria-label="Open menu">...</button>;
		render(<ContextMenu trigger={<Kebab />} items={defaultItems} />);
		const trigger = screen.getByRole('button', { name: 'Open menu' });
		expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
		expect(trigger).toHaveAttribute('aria-expanded', 'false');
		fireEvent.click(trigger);
		await screen.findByRole('menu');
		expect(trigger).toHaveAttribute('aria-expanded', 'true');
	});

	// Pattern A: render already-open to check icon
	it('icon is rendered when provided', () => {
		const items: ContextMenuItem[] = [
			{
				label: 'With Icon',
				icon: <span data-testid="test-icon">i</span>,
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
