import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './Badge.js';

describe('Badge', () => {
    it('renders label', () => {
        render(<Badge label="Active" />);
        expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('applies default variant classes', () => {
        const { container } = render(<Badge label="x" variant="default" />);
        expect(container.firstChild).toHaveClass('bg-muted-bg', 'text-muted');
    });

    it('applies primary variant classes', () => {
        const { container } = render(<Badge label="x" variant="primary" />);
        expect(container.firstChild).toHaveClass('bg-primary', 'text-white');
    });

    it('applies success variant classes', () => {
        const { container } = render(<Badge label="x" variant="success" />);
        expect(container.firstChild).toHaveClass('bg-success', 'text-white');
    });

    it('applies warning variant classes', () => {
        const { container } = render(<Badge label="x" variant="warning" />);
        expect(container.firstChild).toHaveClass('bg-warning-bg', 'text-warning-text');
    });

    it('applies danger variant classes', () => {
        const { container } = render(<Badge label="x" variant="danger" />);
        expect(container.firstChild).toHaveClass('bg-danger', 'text-white');
    });

    it('applies info variant classes', () => {
        const { container } = render(<Badge label="x" variant="info" />);
        expect(container.firstChild).toHaveClass('bg-info-bg', 'text-info-text');
    });

    it('applies sm size classes', () => {
        const { container } = render(<Badge label="x" size="sm" />);
        expect(container.firstChild).toHaveClass('text-xs');
    });

    it('applies md size classes', () => {
        const { container } = render(<Badge label="x" size="md" />);
        expect(container.firstChild).toHaveClass('text-sm');
    });
});
