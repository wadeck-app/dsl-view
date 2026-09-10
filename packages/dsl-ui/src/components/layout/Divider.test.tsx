import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Divider } from './Divider.js';

describe('Divider', () => {
    it('renders with role separator', () => {
        render(<Divider />);
        expect(screen.getByRole('separator')).toBeInTheDocument();
    });

    it('horizontal orientation by default', () => {
        render(<Divider />);
        // Radix Separator omits aria-orientation for horizontal (it's the ARIA default)
        expect(screen.getByRole('separator')).not.toHaveAttribute('aria-orientation', 'vertical');
    });

    it('vertical orientation sets correct aria-orientation', () => {
        render(<Divider orientation="vertical" />);
        expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'vertical');
    });

    it('renders label when provided', () => {
        render(<Divider label="Section" />);
        expect(screen.getByText('Section')).toBeInTheDocument();
    });

    it('renders two separators when label is provided', () => {
        render(<Divider label="OR" />);
        expect(screen.getAllByRole('separator')).toHaveLength(2);
    });
});
