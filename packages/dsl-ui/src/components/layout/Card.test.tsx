import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Card } from './Card.js';

describe('Card', () => {
    it('renders children', () => {
        render(<Card><p>Card content</p></Card>);
        expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('renders header when provided', () => {
        render(<Card header={<span>Card Header</span>}><p>body</p></Card>);
        expect(screen.getByText('Card Header')).toBeInTheDocument();
    });

    it('does not render header section when not provided', () => {
        const { container } = render(<Card><p>body</p></Card>);
        // Should not have a border-b div
        expect(container.querySelectorAll('.border-b')).toHaveLength(0);
    });

    it('renders footer when provided', () => {
        render(<Card footer={<span>Card Footer</span>}><p>body</p></Card>);
        expect(screen.getByText('Card Footer')).toBeInTheDocument();
    });

    it('does not render footer section when not provided', () => {
        const { container } = render(<Card><p>body</p></Card>);
        expect(container.querySelectorAll('.border-t')).toHaveLength(0);
    });

    it('calls onClick when clicked', () => {
        const handleClick = vi.fn();
        render(<Card onClick={handleClick}><p>clickable</p></Card>);
        fireEvent.click(screen.getByRole('button'));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('has cursor-pointer class when onClick is provided', () => {
        const { container } = render(<Card onClick={() => {}}><p>body</p></Card>);
        expect(container.firstChild).toHaveClass('cursor-pointer');
    });

    it('does not have role=button when onClick is not provided', () => {
        render(<Card><p>body</p></Card>);
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('applies padding=none — no padding class present', () => {
        const { container } = render(<Card padding="none"><p>body</p></Card>);
        // None of the card's divs should have a padding class
        expect(container.querySelector('.p-3, .p-4, .p-6')).not.toBeInTheDocument();
    });

    it('applies padding=sm class on content wrapper', () => {
        const { container } = render(<Card padding="sm"><p>body</p></Card>);
        // card root > first child = content wrapper
        const contentDiv = container.firstElementChild?.firstElementChild as HTMLElement | null;
        expect(contentDiv).toHaveClass('p-3');
    });

    it('applies padding=lg class on content wrapper', () => {
        const { container } = render(<Card padding="lg"><p>body</p></Card>);
        const contentDiv = container.firstElementChild?.firstElementChild as HTMLElement | null;
        expect(contentDiv).toHaveClass('p-6');
    });

    it('merges custom className', () => {
        const { container } = render(<Card className="my-custom-class"><p>body</p></Card>);
        expect(container.firstChild).toHaveClass('my-custom-class');
    });

    it('applies shadow class by default', () => {
        const { container } = render(<Card><p>body</p></Card>);
        expect(container.firstChild).toHaveClass('shadow-sm');
    });

    it('omits shadow class when shadow=false', () => {
        const { container } = render(<Card shadow={false}><p>body</p></Card>);
        expect(container.firstChild).not.toHaveClass('shadow-sm');
    });

    it('applies border class by default', () => {
        const { container } = render(<Card><p>body</p></Card>);
        expect(container.firstChild).toHaveClass('border');
    });

    it('omits border class when border=false', () => {
        const { container } = render(<Card border={false}><p>body</p></Card>);
        expect(container.firstChild).not.toHaveClass('border');
    });
});
