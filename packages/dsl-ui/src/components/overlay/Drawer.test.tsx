import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Drawer, useDrawerClose } from './Drawer.js';

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

		// Place focus on the last focusable element then Tab: should wrap to first
		act(() => {
			focusable[focusable.length - 1].focus();
		});
		expect(document.activeElement).toBe(focusable[focusable.length - 1]);

		fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
		// After Tab on last element, focus wraps to first
		expect(document.activeElement).toBe(focusable[0]);
	});

	describe('closed state', () => {
		it('is inert while closed (out of the tab order and the accessibility tree) and not inert when open', () => {
			const { rerender } = renderDrawer({ open: false });
			expect(screen.getByTestId('drawer-panel')).toHaveAttribute('inert');
			rerender(
				<Drawer open={true} onClose={vi.fn()} title="Test Drawer">
					<p>Drawer content</p>
				</Drawer>
			);
			expect(screen.getByTestId('drawer-panel')).not.toHaveAttribute('inert');
		});

		it('Escape does nothing and is not swallowed while closed', () => {
			const onClose = vi.fn();
			renderDrawer({ open: false, onClose });
			const notCancelled = fireEvent.keyDown(document, { key: 'Escape' });
			expect(onClose).not.toHaveBeenCalled();
			expect(notCancelled).toBe(true);
		});

		it('a click on the invisible backdrop does nothing while closed', () => {
			const onClose = vi.fn();
			renderDrawer({ open: false, onClose });
			fireEvent.click(screen.getByTestId('drawer-backdrop'));
			expect(onClose).not.toHaveBeenCalled();
		});

		it('Tab is not trapped while closed', () => {
			render(
				<Drawer open={false} onClose={vi.fn()} title="Closed">
					<button>Only</button>
				</Drawer>
			);
			// The only focusable element is also the last one: while open, Tab on it would wrap and be cancelled.
			screen.getByText('Only').focus();
			expect(fireEvent.keyDown(document, { key: 'Tab' })).toBe(true);
		});
	});

	describe('keyboard', () => {
		it('Escape prevents the default action when open', () => {
			renderDrawer({ open: true });
			expect(fireEvent.keyDown(document, { key: 'Escape' })).toBe(false);
		});

		it('Escape calls the LATEST onClose, not the one from the first render', () => {
			const first = vi.fn();
			const latest = vi.fn();
			const { rerender } = render(
				<Drawer open={true} onClose={first} title="T">
					<p>x</p>
				</Drawer>
			);
			rerender(
				<Drawer open={true} onClose={latest} title="T">
					<p>x</p>
				</Drawer>
			);
			fireEvent.keyDown(document, { key: 'Escape' });
			expect(latest).toHaveBeenCalledTimes(1);
			expect(first).not.toHaveBeenCalled();
		});

		it('Shift+Tab on the first focusable wraps to the last one', () => {
			render(
				<Drawer open={true} onClose={vi.fn()} title="Trap" hideCloseButton>
					<button>First</button>
					<button>Second</button>
				</Drawer>
			);
			const first = screen.getByText('First');
			const second = screen.getByText('Second');
			act(() => first.focus());
			const notCancelled = fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
			expect(notCancelled).toBe(false);
			expect(document.activeElement).toBe(second);
		});

		it('Tab from a middle element is left to the browser (no wrap, default not prevented)', () => {
			render(
				<Drawer open={true} onClose={vi.fn()} title="Trap" hideCloseButton>
					<button>First</button>
					<button>Middle</button>
					<button>Last</button>
				</Drawer>
			);
			const middle = screen.getByText('Middle');
			act(() => middle.focus());
			const notCancelled = fireEvent.keyDown(document, { key: 'Tab' });
			expect(notCancelled).toBe(true);
			expect(document.activeElement).toBe(middle);
		});
	});

	describe('disabled controls are not focus stops', () => {
		it('Tab on the last ENABLED control wraps to the first even when a disabled button follows it', () => {
			render(
				<Drawer open={true} onClose={vi.fn()} title="Trap" hideCloseButton>
					<button>First</button>
					<button>Second</button>
					<button disabled>Disabled last</button>
				</Drawer>
			);
			const second = screen.getByText('Second');
			act(() => second.focus());
			const notCancelled = fireEvent.keyDown(document, { key: 'Tab' });
			expect(notCancelled).toBe(false);
			expect(document.activeElement).toBe(screen.getByText('First'));
		});

		it('Shift+Tab on the first ENABLED control wraps to the last enabled one even when a disabled button leads', () => {
			render(
				<Drawer open={true} onClose={vi.fn()} title="Trap" hideCloseButton>
					<button disabled>Disabled first</button>
					<button>First</button>
					<button>Last</button>
				</Drawer>
			);
			act(() => screen.getByText('First').focus());
			const notCancelled = fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
			expect(notCancelled).toBe(false);
			expect(document.activeElement).toBe(screen.getByText('Last'));
		});

		it('with nothing focusable inside, Tab cannot leave the modal: it is cancelled and focus rests on the panel', () => {
			render(
				<Drawer open={true} onClose={vi.fn()} title="Trap" hideCloseButton>
					<p>Read only</p>
				</Drawer>
			);
			const panel = screen.getByTestId('drawer-panel');
			expect(fireEvent.keyDown(document, { key: 'Tab' })).toBe(false);
			expect(document.activeElement).toBe(panel);
			expect(fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })).toBe(false);
			expect(document.activeElement).toBe(panel);
		});

		it('Shift+Tab from a middle control is left to the browser (no wrap, default not prevented)', () => {
			render(
				<Drawer open={true} onClose={vi.fn()} title="Trap" hideCloseButton>
					<button>First</button>
					<button>Middle</button>
					<button>Last</button>
				</Drawer>
			);
			const middle = screen.getByText('Middle');
			act(() => middle.focus());
			expect(fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })).toBe(true);
			expect(document.activeElement).toBe(middle);
		});

		it('a hidden input is not a focus stop either', () => {
			render(
				<Drawer open={true} onClose={vi.fn()} title="Trap" hideCloseButton>
					<button>Only</button>
					<input type="hidden" name="token" defaultValue="x" />
				</Drawer>
			);
			act(() => screen.getByText('Only').focus());
			expect(fireEvent.keyDown(document, { key: 'Tab' })).toBe(false);
			expect(document.activeElement).toBe(screen.getByText('Only'));
		});

		it('the initial focus skips a disabled first control', async () => {
			render(
				<Drawer open={true} onClose={vi.fn()} title="Trap" hideCloseButton>
					<button disabled>Disabled first</button>
					<input aria-label="Name" />
				</Drawer>
			);
			await waitFor(() => {
				expect(document.activeElement).toBe(screen.getByLabelText('Name'));
			});
		});
	});

	describe('focus that is outside the open drawer', () => {
		function renderWithOutsideControl() {
			return render(
				<>
					<button>Outside before</button>
					<Drawer open={true} onClose={vi.fn()} title="Trap" hideCloseButton>
						<button>First</button>
						<button>Last</button>
					</Drawer>
					<button>Outside after</button>
				</>
			);
		}

		it('Tab from a control outside the drawer pulls focus onto the first control inside', () => {
			renderWithOutsideControl();
			act(() => screen.getByText('Outside after').focus());
			expect(fireEvent.keyDown(document, { key: 'Tab' })).toBe(false);
			expect(document.activeElement).toBe(screen.getByText('First'));
		});

		it('Shift+Tab from a control outside the drawer pulls focus onto the LAST control inside', () => {
			renderWithOutsideControl();
			act(() => screen.getByText('Outside before').focus());
			expect(fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })).toBe(false);
			expect(document.activeElement).toBe(screen.getByText('Last'));
		});

		it('Tab with focus lost on <body> (nothing focused) enters the drawer', () => {
			renderWithOutsideControl();
			act(() => (document.activeElement as HTMLElement | null)?.blur());
			expect(document.activeElement).toBe(document.body);
			expect(fireEvent.keyDown(document, { key: 'Tab' })).toBe(false);
			expect(document.activeElement).toBe(screen.getByText('First'));
		});

		it('Shift+Tab on the panel itself (it can hold focus programmatically) goes to the last control', () => {
			renderWithOutsideControl();
			const panel = screen.getByTestId('drawer-panel');
			act(() => panel.focus());
			// Precondition: the panel really holds focus (it has tabindex="-1"), otherwise the case is not exercised.
			expect(document.activeElement).toBe(panel);
			expect(fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })).toBe(false);
			expect(document.activeElement).toBe(screen.getByText('Last'));
		});

		it('leaves Tab alone while focus sits in another overlay layer (a portaled listbox of a field inside the drawer)', () => {
			render(
				<Drawer open={true} onClose={vi.fn()} title="Trap" hideCloseButton>
					<button>First</button>
				</Drawer>
			);
			const layer = document.createElement('div');
			layer.setAttribute('role', 'listbox');
			const option = document.createElement('button');
			option.textContent = 'Portaled option';
			layer.appendChild(option);
			document.body.appendChild(layer);
			try {
				act(() => option.focus());
				expect(fireEvent.keyDown(document, { key: 'Tab' })).toBe(true);
				expect(document.activeElement).toBe(option);
			} finally {
				layer.remove();
			}
		});
	});

	describe('naming', () => {
		it('with a title the dialog is labelled by it and has no fallback aria-label', () => {
			renderDrawer({ open: true, title: 'Settings' });
			const dialog = screen.getByRole('dialog', { name: 'Settings' });
			expect(dialog).not.toHaveAttribute('aria-label');
		});

		it('without a title the dialog still has an accessible name, and no aria-labelledby', () => {
			renderDrawer({ open: true, title: undefined });
			const dialog = screen.getByRole('dialog', { name: 'Drawer' });
			expect(dialog).not.toHaveAttribute('aria-labelledby');
			expect(dialog.querySelector('h2')).toBeNull();
		});
	});

	describe('useDrawerClose', () => {
		function CloseFromInside() {
			const close = useDrawerClose();
			return <button onClick={() => close?.()}>Close from inside</button>;
		}

		it('hands the drawer content the close callback of the drawer', () => {
			const onClose = vi.fn();
			renderDrawer({ open: true, onClose, children: <CloseFromInside /> });
			fireEvent.click(screen.getByText('Close from inside'));
			expect(onClose).toHaveBeenCalledTimes(1);
		});

		it('is null outside any drawer', () => {
			let seen: unknown = 'unset';
			function Probe() {
				seen = useDrawerClose();
				return null;
			}
			render(<Probe />);
			expect(seen).toBeNull();
		});
	});

	describe('lifecycle', () => {
		it('stops listening to the keyboard when unmounted while open', () => {
			const onClose = vi.fn();
			const { unmount } = renderDrawer({ open: true, onClose });
			unmount();
			expect(fireEvent.keyDown(document, { key: 'Escape' })).toBe(true);
			expect(onClose).not.toHaveBeenCalled();
		});
	});

	describe('focus management', () => {
		it('moves focus to the first focusable element when opened', async () => {
			renderDrawer({ open: true });
			await waitFor(() => {
				expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close drawer' }));
			});
		});

		it('gives focus back to the element that had it before opening, when closed', async () => {
			const onClose = vi.fn();
			function Host({ open }: { open: boolean }) {
				return (
					<>
						<button>Outer</button>
						<Drawer open={open} onClose={onClose} title="T">
							<p>x</p>
						</Drawer>
					</>
				);
			}
			const { rerender } = render(<Host open={false} />);
			const outer = screen.getByText('Outer');
			outer.focus();
			rerender(<Host open={true} />);
			await waitFor(() => {
				expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close drawer' }));
			});
			rerender(<Host open={false} />);
			expect(document.activeElement).toBe(outer);
		});
	});
});
