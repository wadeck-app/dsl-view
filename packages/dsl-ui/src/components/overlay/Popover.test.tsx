import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

	it('clicking the trigger opens the popover', async () => {
		const user = userEvent.setup();
		render(
			<Popover trigger={<button>Open</button>}>
				<p>Panel content</p>
			</Popover>
		);
		await user.click(screen.getByRole('button', { name: 'Open' }));
		expect(screen.getByTestId('popover-content')).toBeInTheDocument();
	});

	it('renders children content when open', async () => {
		const user = userEvent.setup();
		render(
			<Popover trigger={<button>Open</button>}>
				<p>Hello from popover</p>
			</Popover>
		);
		await user.click(screen.getByRole('button', { name: 'Open' }));
		expect(screen.getByText('Hello from popover')).toBeInTheDocument();
	});

	it('pressing Escape closes the popover', async () => {
		const user = userEvent.setup();
		render(
			<Popover trigger={<button>Open</button>}>
				<p>Panel content</p>
			</Popover>
		);
		await user.click(screen.getByRole('button', { name: 'Open' }));
		expect(screen.getByTestId('popover-content')).toBeInTheDocument();
		await user.keyboard('{Escape}');
		expect(screen.queryByTestId('popover-content')).not.toBeInTheDocument();
	});

	it('clicking the trigger again closes the popover', async () => {
		const user = userEvent.setup();
		render(
			<Popover trigger={<button>Open</button>}>
				<p>Panel content</p>
			</Popover>
		);
		await user.click(screen.getByRole('button', { name: 'Open' }));
		expect(screen.getByTestId('popover-content')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Open' }));
		expect(screen.queryByTestId('popover-content')).not.toBeInTheDocument();
	});

	it('panel has role="dialog"', async () => {
		const user = userEvent.setup();
		render(
			<Popover trigger={<button>Open</button>}>
				<p>Panel content</p>
			</Popover>
		);
		await user.click(screen.getByRole('button', { name: 'Open' }));
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

	it('controlled mode: calls onOpenChange when trigger is clicked', async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn();
		render(
			<Popover trigger={<button>Open</button>} open={false} onOpenChange={onOpenChange}>
				<p>Content</p>
			</Popover>
		);
		await user.click(screen.getByRole('button', { name: 'Open' }));
		expect(onOpenChange).toHaveBeenCalledWith(true);
	});

	it('controlled mode: calls onOpenChange(false) when Escape is pressed while open', async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn();
		render(
			<Popover trigger={<button>Open</button>} open={true} onOpenChange={onOpenChange}>
				<p>Content</p>
			</Popover>
		);
		await user.keyboard('{Escape}');
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it('accepts className prop and forwards it to the content', async () => {
		const user = userEvent.setup();
		render(
			<Popover trigger={<button>Open</button>} className="custom-class">
				<p>Content</p>
			</Popover>
		);
		await user.click(screen.getByRole('button', { name: 'Open' }));
		const content = screen.getByTestId('popover-content');
		expect(content.className).toContain('custom-class');
	});

	it('side prop is forwarded to the content (renders without error)', async () => {
		const user = userEvent.setup();
		render(
			<Popover trigger={<button>Open</button>} side="top">
				<p>Top popover</p>
			</Popover>
		);
		await user.click(screen.getByRole('button', { name: 'Open' }));
		expect(screen.getByText('Top popover')).toBeInTheDocument();
	});

	it('align prop is forwarded without error', async () => {
		const user = userEvent.setup();
		render(
			<Popover trigger={<button>Open</button>} align="end">
				<p>End-aligned</p>
			</Popover>
		);
		await user.click(screen.getByRole('button', { name: 'Open' }));
		expect(screen.getByText('End-aligned')).toBeInTheDocument();
	});

	it('supports interactive content inside the panel', async () => {
		const user = userEvent.setup();
		const onAction = vi.fn();
		render(
			<Popover trigger={<button>Open</button>}>
				<button onClick={onAction}>Action inside popover</button>
			</Popover>
		);
		await user.click(screen.getByRole('button', { name: 'Open' }));
		await user.click(screen.getByRole('button', { name: 'Action inside popover' }));
		expect(onAction).toHaveBeenCalledOnce();
	});
});
