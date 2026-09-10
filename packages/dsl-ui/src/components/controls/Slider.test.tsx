import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Slider } from './Slider.js';

describe('Slider', () => {
    it('renders slider role', () => {
        render(<Slider value={50} onChange={vi.fn()} />);
        expect(screen.getByRole('slider')).toBeInTheDocument();
    });

    it('reflects aria-valuenow', () => {
        render(<Slider value={42} onChange={vi.fn()} />);
        expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '42');
    });

    it('renders label when provided', () => {
        render(<Slider value={50} onChange={vi.fn()} label="Volume" />);
        expect(screen.getByText('Volume')).toBeInTheDocument();
    });

    it('renders current value when showValue is true', () => {
        render(<Slider value={75} onChange={vi.fn()} showValue />);
        expect(screen.getByText('75')).toBeInTheDocument();
    });

    it('is disabled when disabled prop is set', () => {
        render(<Slider value={50} onChange={vi.fn()} disabled />);
        // Radix Slider thumb is a <span> - disabled expressed as data-disabled=""
        expect(screen.getByRole('slider')).toHaveAttribute('data-disabled', '');
    });
});
