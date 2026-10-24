import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ContextMenu } from './ContextMenu.js';
import type { ContextMenuItem } from './ContextMenu.js';

// Focusable items are the enabled, non-separator ones: Alpha (0), Charlie (3), Delta (4).
const items: ContextMenuItem[] = [
	{ label: 'Alpha', onClick: vi.fn() },
	{ label: 'Divider', onClick: vi.fn(), separator: true },
	{ label: 'Bravo', onClick: vi.fn(), disabled: true },
	{ label: 'Charlie', onClick: vi.fn() },
	{ label: 'Delta', onClick: vi.fn() },
];

const item = (name: string) => screen.getByRole('menuitem', { name });
const menu = () => screen.getByRole('menu');

function renderOpen(menuItems: ContextMenuItem[] = items) {
	render(<ContextMenu trigger={<button>Menu</button>} items={menuItems} open />);
}

// fireEvent returns false when the handler called preventDefault().
const press = (key: string, target: HTMLElement = menu()) => fireEvent.keyDown(target, { key });

describe('ContextMenu keyboard navigation', () => {
	it('puts the focus on the first enabled item when it opens', () => {
		renderOpen([{ label: 'Off', onClick: vi.fn(), disabled: true }, { label: 'Divider', onClick: vi.fn(), separator: true }, ...items.slice(3)]);
		expect(document.activeElement).toBe(item('Charlie'));
	});

	it('opens without moving the focus when no item can take it', () => {
		expect(() => renderOpen([{ label: 'Off', onClick: vi.fn(), disabled: true }])).not.toThrow();
		expect(document.activeElement).not.toBe(item('Off'));
	});

	describe('ArrowDown', () => {
		it('moves to the next enabled item, skipping separators and disabled items', () => {
			renderOpen();
			item('Alpha').focus();
			press('ArrowDown');
			expect(document.activeElement).toBe(item('Charlie'));
			press('ArrowDown');
			expect(document.activeElement).toBe(item('Delta'));
		});

		it('wraps from the last item to the first', () => {
			renderOpen();
			item('Delta').focus();
			press('ArrowDown');
			expect(document.activeElement).toBe(item('Alpha'));
		});

		it('goes to the first item when nothing in the menu has the focus', () => {
			renderOpen();
			(document.activeElement as HTMLElement | null)?.blur();
			press('ArrowDown');
			expect(document.activeElement).toBe(item('Alpha'));
		});

		it('keeps the page from scrolling', () => {
			renderOpen();
			item('Alpha').focus();
			expect(press('ArrowDown')).toBe(false);
		});
	});

	describe('ArrowUp', () => {
		it('moves to the previous enabled item, skipping separators and disabled items', () => {
			renderOpen();
			item('Delta').focus();
			press('ArrowUp');
			expect(document.activeElement).toBe(item('Charlie'));
			press('ArrowUp');
			expect(document.activeElement).toBe(item('Alpha'));
		});

		it('wraps from the first item to the last', () => {
			renderOpen();
			item('Alpha').focus();
			press('ArrowUp');
			expect(document.activeElement).toBe(item('Delta'));
		});

		it('goes to the last item when nothing in the menu has the focus', () => {
			renderOpen();
			(document.activeElement as HTMLElement | null)?.blur();
			press('ArrowUp');
			expect(document.activeElement).toBe(item('Delta'));
		});

		it('keeps the page from scrolling', () => {
			renderOpen();
			item('Charlie').focus();
			expect(press('ArrowUp')).toBe(false);
		});
	});

	describe('Home and End', () => {
		it('Home goes to the first enabled item', () => {
			renderOpen();
			item('Delta').focus();
			expect(press('Home')).toBe(false);
			expect(document.activeElement).toBe(item('Alpha'));
		});

		it('End goes to the last enabled item', () => {
			renderOpen();
			item('Alpha').focus();
			expect(press('End')).toBe(false);
			expect(document.activeElement).toBe(item('Delta'));
		});

		it('skip a disabled first or last item', () => {
			renderOpen([{ label: 'Off 1', onClick: vi.fn(), disabled: true }, { label: 'One', onClick: vi.fn() }, { label: 'Two', onClick: vi.fn() }, { label: 'Off 2', onClick: vi.fn(), disabled: true }]);
			press('Home');
			expect(document.activeElement).toBe(item('One'));
			press('End');
			expect(document.activeElement).toBe(item('Two'));
		});
	});

	it('leaves every other key alone', () => {
		renderOpen();
		item('Alpha').focus();
		expect(press('a')).toBe(true);
		expect(press('Enter')).toBe(true);
		expect(document.activeElement).toBe(item('Alpha'));
	});

	it('does not throw on navigation keys when no item can take the focus', () => {
		renderOpen([{ label: 'Off', onClick: vi.fn(), disabled: true }]);
		for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End']) {
			expect(() => press(key)).not.toThrow();
		}
	});
});

describe('ContextMenu open state', () => {
	it('opens on the trigger and closes after an item is chosen when it manages its own state', () => {
		const onClick = vi.fn();
		render(<ContextMenu trigger={<button>Menu</button>} items={[{ label: 'Edit', onClick }]} />);
		expect(screen.queryByRole('menu')).toBeNull();
		fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
		expect(screen.getByRole('menu')).toBeInTheDocument();
		fireEvent.click(item('Edit'));
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole('menu')).toBeNull();
	});

	it('leaves the open state to its owner when controlled: the trigger only asks', () => {
		const onOpenChange = vi.fn();
		render(<ContextMenu trigger={<button>Menu</button>} items={[{ label: 'Edit', onClick: vi.fn() }]} open={false} onOpenChange={onOpenChange} />);
		fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
		expect(onOpenChange).toHaveBeenCalledWith(true);
		expect(screen.queryByRole('menu')).toBeNull();
	});

	it('stays open after an item is chosen when the owner keeps it open', () => {
		const onOpenChange = vi.fn();
		render(<ContextMenu trigger={<button>Menu</button>} items={[{ label: 'Edit', onClick: vi.fn() }]} open onOpenChange={onOpenChange} />);
		fireEvent.click(item('Edit'));
		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(screen.getByRole('menu')).toBeInTheDocument();
	});
});
