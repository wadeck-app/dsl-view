import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar } from './Avatar.js';

describe('Avatar', () => {
    it('renders fallback initials when no src', async () => {
        render(<Avatar fallback="JD" />);
        // Radix Fallback renders asynchronously (setTimeout 0) even with delayMs=0
        expect(await screen.findByText('JD')).toBeInTheDocument();
    });

    it('renders fallback from alt when no fallback prop', async () => {
        render(<Avatar alt="John Doe" />);
        expect(await screen.findByText('Jo')).toBeInTheDocument();
    });

    it('renders fallback "?" when no fallback and no alt', async () => {
        render(<Avatar />);
        expect(await screen.findByText('?')).toBeInTheDocument();
    });

    it('applies sm size classes', () => {
        const { container } = render(<Avatar fallback="JD" size="sm" />);
        expect(container.firstChild).toHaveClass('w-6', 'h-6');
    });

    it('applies lg size classes', () => {
        const { container } = render(<Avatar fallback="JD" size="lg" />);
        expect(container.firstChild).toHaveClass('w-12', 'h-12');
    });

    it('renders without crash when src is provided', () => {
        // Radix Avatar Image does not render in jsdom (no image loading mechanism)
        const { container } = render(<Avatar src="https://example.com/avatar.jpg" alt="User" />);
        expect(container.firstChild).toBeInTheDocument();
    });
});
