import { fireEvent, render, screen } from '@testing-library/react';
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
