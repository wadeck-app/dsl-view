import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Tag } from './Tag.js';

describe('Tag', () => {
    it('renders label', () => {
        render(<Tag label="React" />);
        expect(screen.getByText('React')).toBeInTheDocument();
    });

    it('does not render remove button when onRemove is not provided', () => {
        render(<Tag label="React" />);
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders remove button when onRemove is provided', () => {
        render(<Tag label="React" onRemove={vi.fn()} />);
        expect(screen.getByRole('button', { name: 'Remove React' })).toBeInTheDocument();
    });

    it('calls onRemove when x button is clicked', () => {
        const onRemove = vi.fn();
        render(<Tag label="React" onRemove={onRemove} />);
        fireEvent.click(screen.getByRole('button', { name: 'Remove React' }));
        expect(onRemove).toHaveBeenCalledOnce();
    });

    it('applies blue color classes', () => {
        const { container } = render(<Tag label="x" color="blue" />);
        // violations-suppress: tailwind/no-raw-color-class Tag palette uses intentional raw colors (see Tag.tsx)
        expect(container.firstChild).toHaveClass('bg-blue-100', 'text-blue-800');
    });

    it('applies default color classes', () => {
        const { container } = render(<Tag label="x" color="default" />);
        expect(container.firstChild).toHaveClass('bg-muted-bg', 'text-muted');
    });
});
