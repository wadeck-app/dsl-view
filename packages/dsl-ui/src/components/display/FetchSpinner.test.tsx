import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FetchSpinner } from './FetchSpinner.js';

describe('FetchSpinner', () => {
	it('renders nothing at all while not loading', () => {
		const { container } = render(<FetchSpinner loading={false} />);

		expect(container).toBeEmptyDOMElement();
	});

	it('renders a labelled spinner while loading, and removes it when loading ends', () => {
		const { rerender, container } = render(<FetchSpinner loading />);
		expect(screen.getByLabelText('Loading')).toBeInTheDocument();

		rerender(<FetchSpinner loading={false} />);
		expect(container).toBeEmptyDOMElement();
	});
});
