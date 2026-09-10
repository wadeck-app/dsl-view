import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from './Skeleton.js';

describe('Skeleton', () => {
    it('renders with role status', () => {
        render(<Skeleton />);
        expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders single item by default', () => {
        const { container } = render(<Skeleton />);
        const items = container.querySelectorAll('.animate-pulse');
        expect(items).toHaveLength(1);
    });

    it('renders count items when count > 1', () => {
        const { container } = render(<Skeleton count={3} />);
        const items = container.querySelectorAll('.animate-pulse');
        expect(items).toHaveLength(3);
    });

    it('applies circle rounding for circle variant', () => {
        const { container } = render(<Skeleton variant="circle" width="40px" />);
        const item = container.querySelector('.animate-pulse');
        expect(item).toHaveClass('rounded-full');
    });

    it('applies line rounding for line variant', () => {
        const { container } = render(<Skeleton variant="line" />);
        const item = container.querySelector('.animate-pulse');
        expect(item).toHaveClass('rounded');
        expect(item).not.toHaveClass('rounded-full');
    });

    it('applies custom width and height', () => {
        const { container } = render(<Skeleton width="200px" height="40px" />);
        const item = container.querySelector('.animate-pulse') as HTMLElement;
        expect(item.style.width).toBe('200px');
        expect(item.style.height).toBe('40px');
    });
});
