import { fireEvent, render, screen } from '@testing-library/react';
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

    it('the label names the slider for assistive tech, not just a text node next to it', () => {
        render(<Slider value={50} onChange={vi.fn()} label="Volume" />);
        expect(screen.getByRole('slider', { name: 'Volume' })).toBeInTheDocument();
    });

    it('without a label there is no accessible name to invent', () => {
        render(<Slider value={50} onChange={vi.fn()} />);
        expect(screen.getByRole('slider')).not.toHaveAttribute('aria-label');
    });

    it('renders current value when showValue is true', () => {
        render(<Slider value={75} onChange={vi.fn()} showValue />);
        expect(screen.getByText('75')).toBeInTheDocument();
    });

    it('does not render the value when showValue is off', () => {
        render(<Slider value={75} onChange={vi.fn()} />);
        expect(screen.queryByText('75')).not.toBeInTheDocument();
    });

    it('is disabled when disabled prop is set', () => {
        render(<Slider value={50} onChange={vi.fn()} disabled />);
        // Radix Slider thumb is a <span> - disabled expressed as data-disabled=""
        expect(screen.getByRole('slider')).toHaveAttribute('data-disabled', '');
    });

    it('defaults to the 0..100 range and exposes custom bounds', () => {
        const { unmount } = render(<Slider value={50} onChange={vi.fn()} />);
        expect(screen.getByRole('slider')).toHaveAttribute('aria-valuemin', '0');
        expect(screen.getByRole('slider')).toHaveAttribute('aria-valuemax', '100');
        unmount();
        render(<Slider value={5} onChange={vi.fn()} min={-10} max={20} />);
        expect(screen.getByRole('slider')).toHaveAttribute('aria-valuemin', '-10');
        expect(screen.getByRole('slider')).toHaveAttribute('aria-valuemax', '20');
    });

    describe('keyboard', () => {
        it('ArrowRight / ArrowLeft move by one step and report the new number', () => {
            const onChange = vi.fn();
            render(<Slider value={50} onChange={onChange} />);
            fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
            expect(onChange).toHaveBeenLastCalledWith(51);
            fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowLeft' });
            expect(onChange).toHaveBeenLastCalledWith(49);
        });

        it('honours a custom step', () => {
            const onChange = vi.fn();
            render(<Slider value={50} onChange={onChange} step={10} />);
            fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
            expect(onChange).toHaveBeenCalledExactlyOnceWith(60);
        });

        it('Home and End jump to the bounds', () => {
            const onChange = vi.fn();
            render(<Slider value={50} onChange={onChange} min={10} max={80} />);
            fireEvent.keyDown(screen.getByRole('slider'), { key: 'Home' });
            expect(onChange).toHaveBeenLastCalledWith(10);
            fireEvent.keyDown(screen.getByRole('slider'), { key: 'End' });
            expect(onChange).toHaveBeenLastCalledWith(80);
        });

        it('a disabled slider ignores the keyboard', () => {
            const onChange = vi.fn();
            render(<Slider value={50} onChange={onChange} disabled />);
            fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
            expect(onChange).not.toHaveBeenCalled();
        });

        it('is controlled: the thumb shows the value prop, not its own movement', () => {
            render(<Slider value={50} onChange={vi.fn()} />);
            fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
            expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '50');
        });
    });
});
