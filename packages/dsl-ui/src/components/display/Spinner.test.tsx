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
