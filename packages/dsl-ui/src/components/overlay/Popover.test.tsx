import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Popover } from './Popover.js';

describe('Popover', () => {
	it('renders the trigger element', () => {
		render(
			<Popover trigger={<button>Open</button>}>
				<p>Panel content</p>
			</Popover>
		);
		expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
	});

	// jsdom has no layout, so positioning itself can't be asserted. What can be: the element Radix
	// measures as the anchor must have a box. `display: contents` has none (rect 0,0,0,0), which
	// anchored the panel at the page's top-left corner instead of under the trigger.
	it('anchors on a wrapper that has a layout box, not display: contents', () => {
		render(
			<Popover trigger={<button>Open</button>}>
				<p>Panel content</p>
			</Popover>
		);
		const anchor = screen.getByRole('button', { name: 'Open' }).parentElement as HTMLElement;
		expect(anchor.style.display).not.toBe('contents');
		expect(anchor.style.display).toBe('inline-flex');
	});

	it('panel is not visible initially', () => {
		render(
			<Popover trigger={<button>Open</button>}>
				<p>Panel content</p>
			</Popover>
		);
		expect(screen.queryByTestId('popover-content')).not.toBeInTheDocument();
	});

	// Pattern B: verify click signals open intent via onOpenChange
	it('clicking the trigger opens the popover', () => {
		const onOpenChange = vi.fn();
		render(
			<Popover trigger={<button>Open</button>} onOpenChange={onOpenChange}>
				<p>Panel content</p>
			</Popover>
		);
		fireEvent.click(screen.getByRole('button', { name: 'Open' }));
		expect(onOpenChange).toHaveBeenCalledWith(true);
	});

	it('manages its own open state when not controlled: the trigger opens and closes the panel', () => {
		render(
			<Popover trigger={<button>Open</button>}>
				<p>Own state content</p>
			</Popover>
		);
		fireEvent.click(screen.getByRole('button', { name: 'Open' }));
		expect(screen.getByText('Own state content')).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: 'Open' }));
		expect(screen.queryByText('Own state content')).not.toBeInTheDocument();
	});

	it('leaves the open state to its owner when controlled: the trigger only asks', () => {
		const onOpenChange = vi.fn();
		render(
			<Popover trigger={<button>Open</button>} open={false} onOpenChange={onOpenChange}>
				<p>Owner content</p>
			</Popover>
		);
		fireEvent.click(screen.getByRole('button', { name: 'Open' }));
		expect(onOpenChange).toHaveBeenCalledWith(true);
		expect(screen.queryByText('Owner content')).not.toBeInTheDocument();
	});

	// Pattern A: render already-open to test content visibility
	it('renders children content when open', () => {
		render(
			<Popover trigger={<button>Open</button>} open={true}>
				<p>Hello from popover</p>
			</Popover>
		);
		expect(screen.getByText('Hello from popover')).toBeInTheDocument();
	});

	// Pattern C: render open, verify Escape signals close via onOpenChange
	it('pressing Escape closes the popover', () => {
		const onOpenChange = vi.fn();
		render(
			<Popover trigger={<button>Open</button>} open={true} onOpenChange={onOpenChange}>
				<p>Panel content</p>
			</Popover>
		);
		expect(screen.getByTestId('popover-content')).toBeInTheDocument();
		fireEvent.keyDown(document.activeElement || document.body, { key: 'Escape' });
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	// Pattern B variant: render open, verify clicking trigger signals close
	it('clicking the trigger again closes the popover', () => {
		const onOpenChange = vi.fn();
		render(
			<Popover trigger={<button>Open</button>} open={true} onOpenChange={onOpenChange}>
				<p>Panel content</p>
			</Popover>
		);
		fireEvent.click(screen.getByRole('button', { name: 'Open' }));
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	// Pattern A: render already-open to test role
	it('panel has role="dialog"', () => {
		render(
			<Popover trigger={<button>Open</button>} open={true}>
				<p>Panel content</p>
			</Popover>
		);
		expect(screen.getByRole('dialog')).toBeInTheDocument();
	});

	it('controlled mode: respects open prop when true', () => {
		render(
			<Popover trigger={<button>Open</button>} open={true} onOpenChange={vi.fn()}>
				<p>Controlled content</p>
			</Popover>
		);
		expect(screen.getByTestId('popover-content')).toBeInTheDocument();
		expect(screen.getByText('Controlled content')).toBeInTheDocument();
	});

	it('controlled mode: respects open prop when false', () => {
		render(
			<Popover trigger={<button>Open</button>} open={false} onOpenChange={vi.fn()}>
				<p>Hidden content</p>
			</Popover>
		);
		expect(screen.queryByTestId('popover-content')).not.toBeInTheDocument();
	});

	it('controlled mode: calls onOpenChange when trigger is clicked', () => {
		const onOpenChange = vi.fn();
		render(
			<Popover trigger={<button>Open</button>} open={false} onOpenChange={onOpenChange}>
				<p>Content</p>
			</Popover>
		);
		fireEvent.click(screen.getByRole('button', { name: 'Open' }));
		expect(onOpenChange).toHaveBeenCalledWith(true);
	});

	it('controlled mode: calls onOpenChange(false) when Escape is pressed while open', () => {
		const onOpenChange = vi.fn();
		render(
			<Popover trigger={<button>Open</button>} open={true} onOpenChange={onOpenChange}>
				<p>Content</p>
			</Popover>
		);
		fireEvent.keyDown(document.activeElement || document.body, { key: 'Escape' });
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	// Pattern A: render already-open to test className forwarding
	it('accepts className prop and forwards it to the content', () => {
		render(
			<Popover trigger={<button>Open</button>} className="custom-class" open={true}>
				<p>Content</p>
			</Popover>
		);
		const content = screen.getByTestId('popover-content');
		expect(content.className).toContain('custom-class');
	});

	// Pattern A: render already-open to test side prop
	it('side prop is forwarded to the content (renders without error)', () => {
		render(
			<Popover trigger={<button>Open</button>} side="top" open={true}>
				<p>Top popover</p>
			</Popover>
		);
		expect(screen.getByText('Top popover')).toBeInTheDocument();
	});

	// Pattern A: render already-open to test align prop
	it('align prop is forwarded without error', () => {
		render(
			<Popover trigger={<button>Open</button>} align="end" open={true}>
				<p>End-aligned</p>
			</Popover>
		);
		expect(screen.getByText('End-aligned')).toBeInTheDocument();
	});

	// Pattern A: render already-open, click interactive content inside
	it('supports interactive content inside the panel', () => {
		const onAction = vi.fn();
		render(
			<Popover trigger={<button>Open</button>} open={true}>
				<button onClick={onAction}>Action inside popover</button>
			</Popover>
		);
		fireEvent.click(screen.getByRole('button', { name: 'Action inside popover' }));
		expect(onAction).toHaveBeenCalledOnce();
	});
});

describe('Popover trigger accessibility', () => {
	// A real browser showed focus falling back to <body> when the panel closed: Radix returns focus to its Trigger,
	// the non-focusable wrapper span, instead of the button the user activated.
	it('returns focus to the trigger button when the panel closes', async () => {
		render(
			<Popover trigger={<button>Open</button>}>
				<p>Panel content</p>
			</Popover>
		);
		const trigger = screen.getByRole('button', { name: 'Open' });
		trigger.focus();
		fireEvent.click(trigger);
		const panel = await screen.findByRole('dialog');
		fireEvent.keyDown(panel, { key: 'Escape' });
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
		expect(document.activeElement).toBe(trigger);
	});

	// A trigger is often a component that forwards no props: the popup state must still reach its button.
	it('sets aria-haspopup and aria-expanded on the button, also for a trigger component that forwards no props', async () => {
		const Plain = () => <button>Open</button>;
		render(
			<Popover trigger={<Plain />}>
				<p>Panel content</p>
			</Popover>
		);
		const trigger = screen.getByRole('button', { name: 'Open' });
		expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
		expect(trigger).toHaveAttribute('aria-expanded', 'false');
		fireEvent.click(trigger);
		await screen.findByRole('dialog');
		expect(trigger).toHaveAttribute('aria-expanded', 'true');
	});
});

// With A open, clicking the trigger of B closes A and opens B. A's close handed focus back to A's trigger, which B's
// focus-outside rule read as "focus left B": B closed at once. Focus goes back only when it has nowhere else to be.
describe('Popover next to another popover', () => {
	it('stays open when it is opened while another popover is open', async () => {
		const { default: userEvent } = await import('@testing-library/user-event');
		const user = userEvent.setup();
		render(
			<div>
				<Popover trigger={<button>Open A</button>}>
					<p>Panel A</p>
				</Popover>
				<Popover trigger={<button>Open B</button>}>
					<p>Panel B</p>
				</Popover>
			</div>
		);
		await user.click(screen.getByRole('button', { name: 'Open A' }));
		await screen.findByText('Panel A');
		await user.click(screen.getByRole('button', { name: 'Open B' }));
		await waitFor(() => expect(screen.queryByText('Panel A')).not.toBeInTheDocument());
		// Let the focus hand-over of A's closing run before judging B.
		await new Promise(resolve => setTimeout(resolve, 50));
		expect(screen.getByText('Panel B')).toBeInTheDocument();
		// Focus is where B put it (its panel), not handed back to A's trigger.
		expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'Open A' }));
	});

	it('still returns focus to its trigger when it closes and focus has gone nowhere else', async () => {
		const { default: userEvent } = await import('@testing-library/user-event');
		const user = userEvent.setup();
		render(
			<Popover trigger={<button>Open</button>}>
				<button>Inside</button>
			</Popover>
		);
		const trigger = screen.getByRole('button', { name: 'Open' });
		await user.click(trigger);
		await user.click(await screen.findByRole('button', { name: 'Inside' }));
		await user.keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByRole('button', { name: 'Inside' })).not.toBeInTheDocument());
		expect(document.activeElement).toBe(trigger);
	});
});
