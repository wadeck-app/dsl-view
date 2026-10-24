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
});

describe('Tag colors and remove button', () => {
    const HUES = ['blue', 'green', 'red', 'yellow', 'purple'];

    // violations-suppress-start: tailwind/no-raw-color-class Tag palette uses intentional raw colors (see Tag.tsx)
    it.each([
        ['blue', ['bg-blue-100', 'text-blue-800']],
        ['green', ['bg-green-100', 'text-green-800']],
        ['red', ['bg-red-100', 'text-red-800']],
        ['yellow', ['bg-yellow-100', 'text-yellow-800']],
        ['purple', ['bg-purple-100', 'text-purple-800']],
    ] as const)("%s uses its own tint and ink and no other hue's", (color, expected) => {
        const { container } = render(<Tag label="x" color={color} />);
        expect(container.firstChild).toHaveClass(...expected);
        for (const other of HUES.filter(hue => hue !== color)) {
            expect((container.firstChild as HTMLElement).className).not.toContain(`-${other}-`);
        }
    });

    // violations-suppress-end: tailwind/no-raw-color-class

    it('default is the neutral muted palette, with no hue', () => {
        const { container } = render(<Tag label="x" color="default" />);
        expect(container.firstChild).toHaveClass('bg-muted-bg', 'text-muted');
        for (const hue of HUES) {
            expect((container.firstChild as HTMLElement).className).not.toContain(`-${hue}-`);
        }
    });

    it('uses the default palette when no color is given', () => {
        const { container } = render(<Tag label="x" />);
        expect(container.firstChild).toHaveClass('bg-muted-bg', 'text-muted');
    });

    it('the remove button never submits a surrounding form', () => {
        const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
        render(
            <form onSubmit={onSubmit}>
                <Tag label="React" onRemove={vi.fn()} />
            </form>
        );
        const button = screen.getByRole('button', { name: 'Remove React' });
        expect(button).toHaveAttribute('type', 'button');
        fireEvent.click(button);
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('removing reports once and leaves the label in place (the parent decides what disappears)', () => {
        const onRemove = vi.fn();
        render(<Tag label="React" onRemove={onRemove} />);
        fireEvent.click(screen.getByRole('button', { name: 'Remove React' }));
        expect(onRemove).toHaveBeenCalledTimes(1);
        expect(screen.getByText('React')).toBeInTheDocument();
    });
});
