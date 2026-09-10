import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Progress } from './Progress.js';

describe('Progress', () => {
    it('renders the progress bar', () => {
        const { container } = render(<Progress value={50} />);
        expect(container.querySelector('[role="progressbar"]')).toBeInTheDocument();
    });

    it('sets indicator width to 50% for value=50', () => {
        const { container } = render(<Progress value={50} />);
        const indicator = container.querySelector('[role="progressbar"] > *') as HTMLElement;
        expect(indicator.style.width).toBe('50%');
    });

    it('clamps value above max to 100%', () => {
        const { container } = render(<Progress value={150} />);
        const indicator = container.querySelector('[role="progressbar"] > *') as HTMLElement;
        expect(indicator.style.width).toBe('100%');
    });

    it('clamps negative value to 0%', () => {
        const { container } = render(<Progress value={-10} />);
        const indicator = container.querySelector('[role="progressbar"] > *') as HTMLElement;
        expect(indicator.style.width).toBe('0%');
    });

    it('renders label when provided', () => {
        render(<Progress value={30} label="Upload progress" />);
        expect(screen.getByText('Upload progress')).toBeInTheDocument();
    });

    it('renders percentage when showValue is true', () => {
        render(<Progress value={42} showValue />);
        expect(screen.getByText('42%')).toBeInTheDocument();
    });

    it('does not render percentage when showValue is false', () => {
        render(<Progress value={42} />);
        expect(screen.queryByText('42%')).not.toBeInTheDocument();
    });

    it('applies success indicator class', () => {
        const { container } = render(<Progress value={50} variant="success" />);
        const indicator = container.querySelector('[role="progressbar"] > *');
        expect(indicator).toHaveClass('bg-success');
    });

    it('applies danger indicator class', () => {
        const { container } = render(<Progress value={50} variant="danger" />);
        const indicator = container.querySelector('[role="progressbar"] > *');
        expect(indicator).toHaveClass('bg-danger');
    });
});
