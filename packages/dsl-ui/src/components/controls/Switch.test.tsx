import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Switch } from './Switch.js';

describe('Switch', () => {
    it('renders switch role', () => {
        render(<Switch checked={false} onChange={vi.fn()} />);
        expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('reflects checked state in both directions', () => {
        const { rerender } = render(<Switch checked={true} onChange={vi.fn()} />);
        expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
        rerender(<Switch checked={false} onChange={vi.fn()} />);
        expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    });

    it('reports the opposite of the current state on click', () => {
        const handler = vi.fn();
        const { rerender } = render(<Switch checked={false} onChange={handler} />);
        fireEvent.click(screen.getByRole('switch'));
        expect(handler).toHaveBeenLastCalledWith(true);
        rerender(<Switch checked={true} onChange={handler} />);
        fireEvent.click(screen.getByRole('switch'));
        expect(handler).toHaveBeenLastCalledWith(false);
        expect(handler).toHaveBeenCalledTimes(2);
    });

    it('is controlled: it does not flip by itself when the parent keeps the value', () => {
        render(<Switch checked={false} onChange={vi.fn()} />);
        fireEvent.click(screen.getByRole('switch'));
        expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    });

    it('the label names the switch and clicking the label toggles it', async () => {
        const user = userEvent.setup();
        const handler = vi.fn();
        render(<Switch checked={false} onChange={handler} label="Enable" />);
        expect(screen.getByRole('switch', { name: 'Enable' })).toBeInTheDocument();
        await user.click(screen.getByText('Enable'));
        expect(handler).toHaveBeenCalledExactlyOnceWith(true);
    });

    it('without a label no empty label element is rendered', () => {
        const { container } = render(<Switch checked={false} onChange={vi.fn()} />);
        expect(container.querySelector('span.text-sm')).toBeNull();
    });

    it('toggles from the keyboard with Space', async () => {
        const user = userEvent.setup();
        const handler = vi.fn();
        render(<Switch checked={false} onChange={handler} />);
        screen.getByRole('switch').focus();
        await user.keyboard(' ');
        expect(handler).toHaveBeenCalledExactlyOnceWith(true);
    });

    it('is disabled when disabled prop is set, and then reports nothing', async () => {
        const user = userEvent.setup();
        const handler = vi.fn();
        render(<Switch checked={false} onChange={handler} disabled label="Locked" />);
        expect(screen.getByRole('switch')).toBeDisabled();
        await user.click(screen.getByText('Locked'));
        await user.click(screen.getByRole('switch'));
        expect(handler).not.toHaveBeenCalled();
    });

    // Size is a geometry contract: the thumb travel must equal track width - thumb width - 2px gap.
    it.each([
        ['sm', 'w-9', 'translate-x-[18px]'],
        ['md', 'w-11', 'translate-x-[22px]'],
    ] as const)('%s size: track %s and the thumb travels %s when on, 0.5 when off', (size, track, travel) => {
        const { container, rerender } = render(<Switch checked={false} onChange={vi.fn()} size={size} />);
        expect(container.querySelector('[role="switch"]')).toHaveClass(track);
        const thumb = () => container.querySelector('[role="switch"] > span');
        expect(thumb()).toHaveClass('translate-x-0.5');
        expect(thumb()).not.toHaveClass(travel);
        rerender(<Switch checked={true} onChange={vi.fn()} size={size} />);
        expect(thumb()).toHaveClass(travel);
        expect(thumb()).not.toHaveClass('translate-x-0.5');
    });
});
