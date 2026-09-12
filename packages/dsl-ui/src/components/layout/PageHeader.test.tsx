import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageSection } from './PageHeader.js';

describe('PageSection', () => {
	it('renders title in a heading element', () => {
		render(<PageSection title="My Page" />);
		const heading = screen.getByRole('heading', { name: 'My Page' });
		expect(heading).toBeInTheDocument();
	});

	it('renders actions slot', () => {
		render(<PageSection title="My Page" actions={<button>New Item</button>} />);
		expect(screen.getByRole('button', { name: 'New Item' })).toBeInTheDocument();
	});

	it('renders children below the header row', () => {
		render(
			<PageSection title="My Page">
				<p>Page subtitle or description</p>
			</PageSection>
		);
		expect(screen.getByText('Page subtitle or description')).toBeInTheDocument();
	});

	it('does not render actions wrapper when actions not provided', () => {
		const { container } = render(<PageSection title="My Page" />);
		const headerRow = container.querySelector('.flex.items-center.justify-between');
		expect(headerRow?.childElementCount).toBe(1);
	});

	it('applies custom className', () => {
		const { container } = render(<PageSection title="My Page" className="custom-class" />);
		expect(container.firstChild).toHaveClass('custom-class');
	});
});
