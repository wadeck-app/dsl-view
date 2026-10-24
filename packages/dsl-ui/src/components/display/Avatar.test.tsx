import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Avatar } from './Avatar.js';

// Built from a code point so the file holds no emoji literal.
const ROCKET = String.fromCodePoint(0x1f680);

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

describe('Avatar fallback text', () => {
    it('treats an empty fallback like a missing one (an empty circle tells nothing)', async () => {
        render(<Avatar fallback="" alt="Jane" />);
        expect(await screen.findByText('Ja')).toBeInTheDocument();
    });

    it('prefers the fallback over the alt text, and keeps it whole (no truncation to two letters)', async () => {
        render(<Avatar fallback="JDOE" alt="Someone Else" />);
        expect(await screen.findByText('JDOE')).toBeInTheDocument();
    });

    it('takes two characters from alt without cutting an emoji in half', async () => {
        render(<Avatar alt={`A${ROCKET} Rocket`} />);
        expect(await screen.findByText(`A${ROCKET}`)).toBeInTheDocument();
    });

    it('applies the medium size by default and the sm/lg text size with the size', () => {
        const md = render(<Avatar fallback="JD" />);
        expect(md.container.firstChild).toHaveClass('w-8', 'h-8', 'text-sm');
        md.unmount();
        const sm = render(<Avatar fallback="JD" size="sm" />);
        expect(sm.container.firstChild).toHaveClass('text-xs');
        sm.unmount();
        const lg = render(<Avatar fallback="JD" size="lg" />);
        expect(lg.container.firstChild).toHaveClass('text-base');
    });
});

describe('Avatar with an image source', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    // With a src the fallback waits 600 ms (the image may still load) instead of flashing initials first.
    it('holds the fallback back for 600 ms while the image has not loaded', () => {
        vi.useFakeTimers();
        render(<Avatar src="https://example.com/a.png" alt="User" fallback="US" />);
        expect(screen.queryByText('US')).toBeNull();
        act(() => {
            vi.advanceTimersByTime(599);
        });
        expect(screen.queryByText('US')).toBeNull();
        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(screen.getByText('US')).toBeInTheDocument();
    });

    it('shows the fallback right away without a src', () => {
        vi.useFakeTimers();
        render(<Avatar fallback="US" />);
        act(() => {
            vi.advanceTimersByTime(0);
        });
        expect(screen.getByText('US')).toBeInTheDocument();
    });
});
