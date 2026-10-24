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

    it('count 1 (and 0) render a single bar with no stacking wrapper; count 2 stacks them', () => {
        const one = render(<Skeleton count={1} />);
        expect(one.container.querySelectorAll('.animate-pulse')).toHaveLength(1);
        expect(screen.getByRole('status').className).not.toContain('flex-col');
        one.unmount();
        const zero = render(<Skeleton count={0} />);
        expect(zero.container.querySelectorAll('.animate-pulse')).toHaveLength(1);
        zero.unmount();
        const two = render(<Skeleton count={2} />);
        expect(two.container.querySelectorAll('.animate-pulse')).toHaveLength(2);
        expect(screen.getByRole('status')).toHaveClass('flex', 'flex-col', 'gap-2');
    });

    it('announces itself once as "Loading" and keeps decorative stacks out of the accessibility tree', () => {
        const live = render(<Skeleton count={3} />);
        expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading');
        live.unmount();
        const quiet = render(<Skeleton count={3} decorative />);
        expect(quiet.container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
        expect(quiet.container.firstElementChild).not.toHaveAttribute('role');
    });

    it('a circle is as tall as it is wide, whatever height says', () => {
        const { container } = render(<Skeleton variant="circle" width="40px" height="10px" />);
        const item = container.querySelector('.animate-pulse') as HTMLElement;
        expect(item.style.width).toBe('40px');
        expect(item.style.height).toBe('40px');
    });

    it('defaults to a full-width one-rem line', () => {
        const { container } = render(<Skeleton />);
        const item = container.querySelector('.animate-pulse') as HTMLElement;
        expect(item.style.width).toBe('100%');
        expect(item.style.height).toBe('1rem');
    });

    it('stacked bars all carry the width and height', () => {
        const { container } = render(<Skeleton count={3} width="50%" height="2rem" />);
        const bars = Array.from(container.querySelectorAll<HTMLElement>('.animate-pulse'));
        expect(bars.map(b => [b.style.width, b.style.height])).toEqual([['50%', '2rem'], ['50%', '2rem'], ['50%', '2rem']]);
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

    it('has no status role when decorative (the parent announces the loading state once)', () => {
        const { container } = render(<Skeleton decorative />);
        expect(screen.queryByRole('status')).toBeNull();
        expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    });

    it('stays still for users who asked for reduced motion', () => {
        const { container } = render(<Skeleton />);
        expect(container.querySelector('.animate-pulse')).toHaveClass('motion-reduce:animate-none');
    });
});
