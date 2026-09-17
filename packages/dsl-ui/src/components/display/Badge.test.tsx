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
        expect(container.firstChild).toHaveClass('bg-surface', 'border', 'border-border', 'text-content');
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

// The variants disagreed on visual weight: success and danger were solid (white on a
// saturated fill) while warning and info were subtle (tinted fill, coloured text). A status
// set that uses several of them therefore rendered as a mix of heavy and light pills in one
// row. `tone` makes the weight an explicit choice that applies to every variant.
describe('Badge tone', () => {
	const statusVariants = ['success', 'warning', 'danger', 'default', 'info'] as const;

	it('defaults to solid, so existing callers are unchanged', () => {
		const { container } = render(<Badge label="OK" variant="success" />);

		expect((container.firstElementChild as HTMLElement).className).toContain('bg-success');
	});

	it('offers a subtle tone', () => {
		const { container } = render(<Badge label="OK" variant="success" tone="subtle" />);

		const cls = (container.firstElementChild as HTMLElement).className;
		expect(cls).toContain('bg-success-bg');
		expect(cls).not.toContain('text-white');
	});

	// The point of the prop: one tone across the whole status set, no mixing.
	it.each(statusVariants)('gives %s a subtle form that never uses white text', variant => {
		const { container } = render(<Badge label="x" variant={variant} tone="subtle" />);

		expect((container.firstElementChild as HTMLElement).className).not.toContain('text-white');
	});

	it('keeps geometry independent of tone', () => {
		const box = (tone: 'solid' | 'subtle') => {
			const { container } = render(<Badge label="x" variant="danger" tone={tone} size="sm" />);
			return (container.firstElementChild as HTMLElement).className
				.split(' ').filter(c => /^(px-|py-|text-xs|text-sm|rounded)/.test(c)).sort().join(' ');
		};

		expect(box('subtle')).toBe(box('solid'));
	});
});
