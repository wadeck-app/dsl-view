import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Switch } from './Switch.js';

describe('Switch', () => {
    it('renders switch role', () => {
        render(<Switch checked={false} onChange={vi.fn()} />);
        expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('reflects checked state', () => {
        render(<Switch checked={true} onChange={vi.fn()} />);
        expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    });

    it('calls onChange on click', () => {
        const handler = vi.fn();
        render(<Switch checked={false} onChange={handler} />);
        fireEvent.click(screen.getByRole('switch'));
        expect(handler).toHaveBeenCalledWith(true);
    });

    it('renders label when provided', () => {
        render(<Switch checked={false} onChange={vi.fn()} label="Enable" />);
        expect(screen.getByText('Enable')).toBeInTheDocument();
    });

    it('is disabled when disabled prop is set', () => {
        render(<Switch checked={false} onChange={vi.fn()} disabled />);
        expect(screen.getByRole('switch')).toBeDisabled();
    });

    it('renders sm size', () => {
        const { container } = render(<Switch checked={false} onChange={vi.fn()} size="sm" />);
        const root = container.querySelector('[role="switch"]');
        expect(root?.className).toContain('w-9');
    });
});
