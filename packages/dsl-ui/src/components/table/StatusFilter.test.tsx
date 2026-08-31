import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { StatusFilter } from './StatusFilter.js';

describe('StatusFilter', () => {
	it('renders all 5 options', () => {
		render(<StatusFilter value="all" onChange={vi.fn()} />);
		for (const label of ['All', '2xx', '3xx', '4xx', '5xx']) {
			expect(screen.getByText(label)).toBeInTheDocument();
		}
	});

	it('"All" is active by default - muted active style', () => {
		render(<StatusFilter value="all" onChange={vi.fn()} />);
		expect(screen.getByText('All').className).toContain('bg-muted-bg');
	});

	it('clicking a status calls onChange with correct value', () => {
		const onChange = vi.fn();
		render(<StatusFilter value="all" onChange={onChange} />);
		fireEvent.click(screen.getByText('4xx'));
		expect(onChange).toHaveBeenCalledWith('4xx');
	});

	it('active button has muted styling class', () => {
		render(<StatusFilter value="2xx" onChange={vi.fn()} />);
		expect(screen.getByText('2xx').className).toContain('bg-muted-bg');
	});

	it('inactive buttons have surface background', () => {
		render(<StatusFilter value="2xx" onChange={vi.fn()} />);
		expect(screen.getByText('All').className).toContain('bg-surface');
	});
});
