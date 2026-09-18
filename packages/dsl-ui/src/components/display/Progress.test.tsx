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

// A consumer skipped this component entirely because it could not fit: w-full plus a label on
// its own line does not go in a dense horizontal row, so a percentage stayed as bare text.
// That is the component being fragile, not the consumer being lazy.
describe('Progress in a dense row', () => {
	it('stacks its label above the bar by default', () => {
		const { container } = render(<Progress value={40} label="uptime" showValue />);

		// Default keeps the existing two-line arrangement.
		expect((container.firstElementChild as HTMLElement).className).toContain('w-full');
	});

	it('puts label, bar and value on one line when inline', () => {
		const { container } = render(<Progress value={40} label="uptime" showValue layout="inline" />);

		const root = container.firstElementChild as HTMLElement;
		expect(root.className).toContain('flex');
		expect(root.className).toContain('items-center');
		expect(root.className).not.toContain('w-full');
	});

	it('gives the inline bar a bounded width so it does not eat the row', () => {
		const { container } = render(<Progress value={40} layout="inline" />);

		const track = container.querySelector('[role="progressbar"], [data-state]');
		expect(track).not.toBeNull();
		expect((track as HTMLElement).className).not.toContain('w-full');
	});

	// Rounding hid the precision a consumer needed: 99.94% availability is not 100%.
	it('shows an exact value when one is given', () => {
		render(<Progress value={99.94} showValue valueLabel="99.94%" />);

		expect(screen.getByText('99.94%')).toBeInTheDocument();
		expect(screen.queryByText('100%')).toBeNull();
	});

	it('still rounds when no exact value is given', () => {
		render(<Progress value={99.94} showValue />);

		expect(screen.getByText('100%')).toBeInTheDocument();
	});

	it('keeps its accessible value whatever the layout', () => {
		render(<Progress value={40} layout="inline" label="uptime" />);

		expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
	});
});
