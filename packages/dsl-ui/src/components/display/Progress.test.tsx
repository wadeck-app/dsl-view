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

describe('Progress value handling', () => {
    const widthOf = (container: HTMLElement) => (container.querySelector('[role="progressbar"] > *') as HTMLElement).style.width;

    it('computes the fraction against a custom max', () => {
        const { container } = render(<Progress value={5} max={20} showValue />);
        expect(widthOf(container)).toBe('25%');
        expect(screen.getByText('25%')).toBeInTheDocument();
    });

    it('clamps to the exact edges: 0 and max are 0% and 100%, just over max stays 100%', () => {
        expect(widthOf(render(<Progress value={0} />).container)).toBe('0%');
        expect(widthOf(render(<Progress value={100} />).container)).toBe('100%');
        expect(widthOf(render(<Progress value={100.01} />).container)).toBe('100%');
    });

    it('rounds the shown percentage half up while the bar keeps the exact fraction', () => {
        const { container } = render(<Progress value={49.5} showValue />);
        expect(screen.getByText('50%')).toBeInTheDocument();
        expect(widthOf(container)).toBe('49.5%');
    });

    // value / 0 and value / NaN are NaN: "NaN%" is not a width, so an unknown fraction draws as an empty bar.
    it('draws an empty bar, never "NaN%", when max is 0 or the value is not a number', () => {
        for (const props of [{ value: 5, max: 0 }, { value: NaN }, { value: undefined as unknown as number }]) {
            const { container, unmount } = render(<Progress {...props} showValue />);
            expect(widthOf(container)).toBe('0%');
            expect(screen.getByText('0%')).toBeInTheDocument();
            unmount();
        }
    });

    it('exposes value and max to assistive technology', () => {
        render(<Progress value={5} max={20} />);
        const bar = screen.getByRole('progressbar');
        expect(bar).toHaveAttribute('aria-valuenow', '5');
        expect(bar).toHaveAttribute('aria-valuemax', '20');
    });

    it('stacked: shows the value without a label, and no header row when neither is asked for', () => {
        const withValue = render(<Progress value={40} showValue />);
        expect(screen.getByText('40%')).toBeInTheDocument();
        withValue.unmount();
        const bare = render(<Progress value={40} />);
        expect(bare.container.firstElementChild!.children).toHaveLength(1);
    });

    it('inline: label and value are optional, and the text follows the bar size', () => {
        const small = render(<Progress value={40} layout="inline" size="sm" label="up" showValue />);
        expect(screen.getByText('up')).toHaveClass('text-xs');
        expect(screen.getByText('40%')).toHaveClass('text-xs');
        small.unmount();
        const medium = render(<Progress value={40} layout="inline" label="up" showValue />);
        expect(screen.getByText('up')).toHaveClass('text-sm');
        medium.unmount();
        const bare = render(<Progress value={40} layout="inline" />);
        expect(bare.container.firstElementChild!.children).toHaveLength(1);
    });

    it('inline: a custom valueLabel replaces the percentage too', () => {
        render(<Progress value={99.94} layout="inline" showValue valueLabel="99.94%" />);
        expect(screen.getByText('99.94%')).toBeInTheDocument();
    });

    it('the size picks the track height', () => {
        const small = render(<Progress value={10} size="sm" />);
        expect(screen.getByRole('progressbar')).toHaveClass('h-1.5');
        small.unmount();
        render(<Progress value={10} />);
        expect(screen.getByRole('progressbar')).toHaveClass('h-2.5');
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
