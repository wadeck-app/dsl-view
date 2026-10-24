import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ShownFetchedCounter } from './ShownFetchedCounter.js';

describe('ShownFetchedCounter', () => {
	it('reads the entries and the total from a response object, with the default field names', () => {
		render(<ShownFetchedCounter raw={{ entries: [1, 2, 3], total: 40 }} />);

		expect(screen.getByText('3 shown / 40 fetched')).toBeInTheDocument();
	});

	it('honours custom field names', () => {
		render(<ShownFetchedCounter raw={{ rows: [1, 2], count: 9 }} entriesField="rows" totalField="count" />);

		expect(screen.getByText('2 shown / 9 fetched')).toBeInTheDocument();
	});

	it('shows zeroes while there is no response yet', () => {
		render(<ShownFetchedCounter raw={undefined} />);

		expect(screen.getByText('0 shown / 0 fetched')).toBeInTheDocument();
	});

	it('pushRight is the only thing that adds the right-alignment class', () => {
		const { rerender } = render(<ShownFetchedCounter raw={[1]} />);
		expect(screen.getByText(/shown/)).not.toHaveClass('ml-auto');

		rerender(<ShownFetchedCounter raw={[1]} pushRight />);
		expect(screen.getByText(/shown/)).toHaveClass('ml-auto');
	});
});
