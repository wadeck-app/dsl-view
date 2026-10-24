import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Spinner } from './Spinner.js';

describe('Spinner', () => {
    it('renders with role status', () => {
        render(<Spinner />);
        expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has default aria-label "Loading..."', () => {
        render(<Spinner />);
        expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading...');
    });

    it('uses custom aria-label when provided', () => {
        render(<Spinner label="Fetching data" />);
        expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Fetching data');
    });

    it('renders sm size with 16px', () => {
        render(<Spinner size="sm" />);
        const svg = screen.getByRole('status');
        expect(svg).toHaveAttribute('width', '16');
        expect(svg).toHaveAttribute('height', '16');
    });

    it('renders lg size with 40px', () => {
        render(<Spinner size="lg" />);
        const svg = screen.getByRole('status');
        expect(svg).toHaveAttribute('width', '40');
        expect(svg).toHaveAttribute('height', '40');
    });
});

describe('Spinner label and size', () => {
    it('defaults to the medium 24px size', () => {
        render(<Spinner />);
        expect(screen.getByRole('status')).toHaveAttribute('width', '24');
        expect(screen.getByRole('status')).toHaveAttribute('height', '24');
    });

    it('shows the label as visible text but announces it once (the visible copy is hidden from assistive technology)', () => {
        render(<Spinner label="Fetching data" />);
        expect(screen.getByText('Fetching data')).toHaveAttribute('aria-hidden', 'true');
        expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Fetching data');
        expect(screen.getAllByRole('status')).toHaveLength(1);
    });

    it('shows no visible text without a label, while still announcing "Loading..."', () => {
        const { container } = render(<Spinner />);
        expect(container.textContent).toBe('');
        expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading...');
    });
});
