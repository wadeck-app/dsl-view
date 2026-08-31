import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageHeader } from './PageHeader.js';

describe('PageHeader', () => {
	it('renders title', () => {
		render(<PageHeader title="My Title" />);
		expect(screen.getByText('My Title')).toBeInTheDocument();
	});

	it('renders subtitle when provided', () => {
		render(<PageHeader title="My Title" subtitle="A subtitle" />);
		expect(screen.getByText('A subtitle')).toBeInTheDocument();
	});

	it('omits subtitle when not provided', () => {
		render(<PageHeader title="My Title" />);
		expect(screen.queryByText('A subtitle')).not.toBeInTheDocument();
	});

	it('renders headerActions to the right of the title in a flex justify-between container', () => {
		render(<PageHeader title="Trash" headerActions={<button>Empty Trash</button>} />);
		expect(screen.getByText('Trash')).toBeInTheDocument();
		expect(screen.getByText('Empty Trash')).toBeInTheDocument();
		// The wrapper should use justify-between
		const wrapper = screen.getByText('Trash').closest('div');
		expect(wrapper).toHaveClass('justify-between');
	});

	it('omits headerActions container when not provided', () => {
		render(<PageHeader title="Files" />);
		// No flex justify-between wrapper when headerActions is absent
		const h1 = screen.getByText('Files');
		expect(h1.closest('div[class*="justify-between"]')).toBeNull();
	});
});
