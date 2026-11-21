import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Badge } from './Badge.js';
import { resetReportedMessages } from '../dev/reportOnce.js';

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
        expect(container.firstChild).toHaveClass('bg-primary', 'text-on-solid');
    });

    it('applies success variant classes', () => {
        const { container } = render(<Badge label="x" variant="success" />);
        expect(container.firstChild).toHaveClass('bg-success', 'text-on-solid');
    });

    it('applies warning variant classes', () => {
        const { container } = render(<Badge label="x" variant="warning" />);
        expect(container.firstChild).toHaveClass('bg-warning-bg', 'text-warning-text');
    });

    it('applies danger variant classes', () => {
        const { container } = render(<Badge label="x" variant="danger" />);
        expect(container.firstChild).toHaveClass('bg-danger', 'text-on-solid');
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

describe('Badge removable', () => {
    it('renders no remove button without onRemove', () => {
        render(<Badge label="Sudo" variant="danger" />);
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('calls onRemove when the cross is clicked, and names the button after the label', () => {
        const onRemove = vi.fn();
        render(<Badge label="Sudo" variant="danger" onRemove={onRemove} />);
        fireEvent.click(screen.getByRole('button', { name: 'Remove Sudo' }));
        expect(onRemove).toHaveBeenCalledOnce();
    });

    it('removeLabel overrides the button name', () => {
        render(<Badge label="Sudo" onRemove={vi.fn()} removeLabel="Leave sudo mode" />);
        expect(screen.getByRole('button', { name: 'Leave sudo mode' })).toBeInTheDocument();
    });

    it('danger subtle badge uses the danger background and text, outlined by an inset ring (no border: the height stays the same)', () => {
        const { container } = render(<Badge label="Sudo" variant="danger" tone="subtle" onRemove={vi.fn()} />);
        expect(container.firstChild).toHaveClass('bg-danger-bg', 'text-danger-text', 'ring-1', 'ring-inset', 'ring-danger');
        expect(container.firstChild).not.toHaveClass('border');
    });

    it('a removable badge has no border and exactly one ring colour, whatever the variant and tone', () => {
        for (const variant of ['default', 'primary', 'success', 'warning', 'danger', 'info'] as const) {
            for (const tone of ['solid', 'subtle'] as const) {
                const { container, unmount } = render(<Badge label="x" variant={variant} tone={tone} onRemove={vi.fn()} />);
                const classes = Array.from((container.firstChild as HTMLElement).classList);
                expect(classes.filter(c => /^border/.test(c)), `${variant}/${tone} border`).toEqual([]);
                expect(classes.filter(c => /^ring-(?!1$|inset$)/.test(c)), `${variant}/${tone} ring`).toHaveLength(1);
                unmount();
            }
        }
    });

    it('subtle: the cross turns into a solid disc of the variant on hover, focus ring in the text colour', () => {
        render(<Badge label="Sudo" variant="danger" tone="subtle" onRemove={vi.fn()} />);
        expect(screen.getByRole('button')).toHaveClass('hover:bg-danger', 'hover:text-on-solid', 'focus-visible:ring-danger-text');
    });

    it('has a native tooltip on the badge and none on the cross', () => {
        const { container } = render(<Badge label="Sudo" title="Sudo mode is on" onRemove={vi.fn()} />);
        expect(container.firstChild).toHaveAttribute('title', 'Sudo mode is on');
        expect(screen.getByRole('button')).not.toHaveAttribute('title');
    });

    it('the cross reacts to hover and keyboard focus', () => {
        render(<Badge label="Sudo" variant="danger" onRemove={vi.fn()} />);
        const cls = screen.getByRole('button').className;
        expect(cls).toMatch(/hover:bg-/);
        expect(cls).toMatch(/focus-visible:ring-/);
        expect(cls).toMatch(/cursor-pointer/);
    });
});

describe('Badge removable with href', () => {
    it('shows no cross and says why', () => {
        resetReportedMessages();
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(<Badge label="Docs" href="/docs" onRemove={vi.fn()} />);
        expect(screen.queryByRole('button')).toBeNull();
        expect(error).toHaveBeenCalledWith(expect.stringContaining('has both href and onRemove'));
        error.mockRestore();
    });
});

describe('Badge title', () => {
    it('sets the native tooltip on a plain badge', () => {
        const { container } = render(<Badge label="x" title="More" />);
        expect(container.firstChild).toHaveAttribute('title', 'More');
    });
});
