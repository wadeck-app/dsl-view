import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Drawer } from './Drawer.js';

function renderDrawer(props: Partial<React.ComponentProps<typeof Drawer>> = {}) {
	const defaultProps = {
		open: true,
		onClose: vi.fn(),
		title: 'Test Drawer',
		children: <p>Drawer content</p>,
	};
	return render(<Drawer {...defaultProps} {...props} />);
}

describe('Drawer', () => {
	it('panel is always in DOM (animation-based visibility)', () => {
		renderDrawer({ open: false });
		expect(screen.getByTestId('drawer-panel')).toBeInTheDocument();
	});

	it('backdrop is always in DOM when closed (opacity-0)', () => {
		renderDrawer({ open: false });
		const backdrop = screen.getByTestId('drawer-backdrop');
		expect(backdrop).toBeInTheDocument();
		expect(backdrop.classList.contains('opacity-0')).toBe(true);
	});

	it('backdrop is visible when open (opacity-100)', () => {
		renderDrawer({ open: true });
		const backdrop = screen.getByTestId('drawer-backdrop');
		expect(backdrop.classList.contains('opacity-100')).toBe(true);
	});

	it('shows dialog role when open', () => {
		renderDrawer({ open: true });
		expect(screen.getByRole('dialog')).toBeInTheDocument();
	});

	it('has aria-modal="true" when open', () => {
		renderDrawer({ open: true });
		expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
	});

	it('aria-labelledby references the title element', () => {
		renderDrawer({ open: true, title: 'My Drawer' });
		const dialog = screen.getByRole('dialog');
		const labelledById = dialog.getAttribute('aria-labelledby');
		expect(labelledById).toBeTruthy();
		const titleEl = document.getElementById(labelledById!);
		expect(titleEl).not.toBeNull();
		expect(titleEl!.textContent).toBe('My Drawer');
	});

	it('title text is displayed', () => {
		renderDrawer({ open: true, title: 'Hello Drawer' });
		expect(screen.getByText('Hello Drawer')).toBeInTheDocument();
	});

	it('onClose is called when close button is clicked', () => {
		const onClose = vi.fn();
		renderDrawer({ open: true, onClose });
		fireEvent.click(screen.getByRole('button', { name: 'Close drawer' }));
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('onClose is called when backdrop is clicked', () => {
		const onClose = vi.fn();
		renderDrawer({ open: true, onClose });
		fireEvent.click(screen.getByTestId('drawer-backdrop'));
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('does NOT call onClose when clicking inside the panel', () => {
		const onClose = vi.fn();
		renderDrawer({ open: true, onClose, children: <button>Inside</button> });
		fireEvent.click(screen.getByRole('button', { name: 'Inside' }));
		expect(onClose).not.toHaveBeenCalled();
	});

	it('onClose is called when Escape key is pressed', () => {
		const onClose = vi.fn();
		renderDrawer({ open: true, onClose });
		fireEvent.keyDown(document, { key: 'Escape' });
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('side="right" applies translate-x-full class when closed', () => {
		renderDrawer({ open: false, side: 'right' });
		const panel = screen.getByTestId('drawer-panel');
		expect(panel.classList.contains('translate-x-full')).toBe(true);
	});

	it('side="right" applies translate-x-0 when open', () => {
		renderDrawer({ open: true, side: 'right' });
		const panel = screen.getByTestId('drawer-panel');
		expect(panel.classList.contains('translate-x-0')).toBe(true);
	});

	it('side="left" applies -translate-x-full class when closed', () => {
		renderDrawer({ open: false, side: 'left' });
		const panel = screen.getByTestId('drawer-panel');
		expect(panel.classList.contains('-translate-x-full')).toBe(true);
	});

	it('side="bottom" applies translate-y-full class when closed', () => {
		renderDrawer({ open: false, side: 'bottom' });
		const panel = screen.getByTestId('drawer-panel');
		expect(panel.classList.contains('translate-y-full')).toBe(true);
	});

	it('size="sm" on right side applies w-64', () => {
		renderDrawer({ open: true, side: 'right', size: 'sm' });
		const panel = screen.getByTestId('drawer-panel');
		expect(panel.classList.contains('w-64')).toBe(true);
	});

	it('size="md" on right side applies w-96', () => {
		renderDrawer({ open: true, side: 'right', size: 'md' });
		const panel = screen.getByTestId('drawer-panel');
		expect(panel.classList.contains('w-96')).toBe(true);
	});

	it('size="lg" on right side applies w-[32rem]', () => {
		renderDrawer({ open: true, side: 'right', size: 'lg' });
		const panel = screen.getByTestId('drawer-panel');
		expect(panel.classList.contains('w-[32rem]')).toBe(true);
	});

	it('size="sm" on bottom applies h-48', () => {
		renderDrawer({ open: true, side: 'bottom', size: 'sm' });
		const panel = screen.getByTestId('drawer-panel');
		expect(panel.classList.contains('h-48')).toBe(true);
	});

	it('size="md" on bottom applies h-96', () => {
		renderDrawer({ open: true, side: 'bottom', size: 'md' });
		const panel = screen.getByTestId('drawer-panel');
		expect(panel.classList.contains('h-96')).toBe(true);
	});

	it('size="lg" on bottom applies h-[32rem]', () => {
		renderDrawer({ open: true, side: 'bottom', size: 'lg' });
		const panel = screen.getByTestId('drawer-panel');
		expect(panel.classList.contains('h-[32rem]')).toBe(true);
	});

	it('footer renders when provided', () => {
		renderDrawer({ open: true, footer: <button>Save</button> });
		expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
	});

	it('footer is not rendered when not provided', () => {
		renderDrawer({ open: true });
		// No footer button besides close
		const buttons = screen.getAllByRole('button');
		expect(buttons.length).toBe(1); // only close button
	});

	it('hideCloseButton hides the close button', () => {
		renderDrawer({ open: true, hideCloseButton: true });
		expect(screen.queryByRole('button', { name: 'Close drawer' })).not.toBeInTheDocument();
	});

	it('close button is shown by default', () => {
		renderDrawer({ open: true });
		expect(screen.getByRole('button', { name: 'Close drawer' })).toBeInTheDocument();
	});

	it('children are rendered', () => {
		renderDrawer({ open: true, children: <p>My drawer body text</p> });
		expect(screen.getByText('My drawer body text')).toBeInTheDocument();
	});

	it('clicking panel content does not call onClose', () => {
		const onClose = vi.fn();
		renderDrawer({
			open: true,
			onClose,
			children: <div data-testid="panel-content">Content here</div>,
		});
		fireEvent.click(screen.getByTestId('panel-content'));
		expect(onClose).not.toHaveBeenCalled();
	});

	it('focus is trapped: Tab key cycles through focusable elements', () => {
		render(
			<Drawer open={true} onClose={vi.fn()} title="Focus Trap Test">
				<button>First</button>
				<button>Second</button>
			</Drawer>
		);
		const panel = screen.getByTestId('drawer-panel');
		const focusable = panel.querySelectorAll<HTMLElement>(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
		);
		expect(focusable.length).toBeGreaterThanOrEqual(2);

		// Place focus on the last focusable element then Tab — should wrap to first
		act(() => {
			focusable[focusable.length - 1].focus();
		});
		expect(document.activeElement).toBe(focusable[focusable.length - 1]);

		fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
		// After Tab on last element, focus wraps to first
		expect(document.activeElement).toBe(focusable[0]);
	});
});
