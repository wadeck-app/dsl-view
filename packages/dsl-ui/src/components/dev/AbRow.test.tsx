import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AbRow } from './AbRow.js';
import type { AbTest } from './abTypes.js';

function testWith(count: number, value = 'o0', onSelect: (id: string) => void = () => {}): AbTest {
	return {
		id: 'row',
		label: 'Row test',
		summary: value,
		value,
		options: Array.from({ length: count }, (_, i) => ({ id: `o${i}`, label: `Option ${i}`, title: `Hint ${i}` })),
		onSelect,
	};
}

const group = () => screen.getByRole('group', { name: 'Row test' });

describe('AbRow', () => {
	it('marks only the current option, in class and in aria-pressed', () => {
		render(<AbRow test={testWith(3, 'o1')} onHide={() => {}} />);
		const buttons = within(group()).getAllByRole('button');
		expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false']);
		expect(buttons.map((b) => b.className.includes('bg-primary-solid'))).toEqual([false, true, false]);
	});

	it('selects an option by its id and hides the test with the eye button', () => {
		const onSelect = vi.fn();
		const onHide = vi.fn();
		render(<AbRow test={testWith(3, 'o0', onSelect)} onHide={onHide} />);
		fireEvent.click(screen.getByRole('button', { name: 'Option 2' }));
		expect(onSelect).toHaveBeenCalledWith('o2');
		fireEvent.click(screen.getByRole('button', { name: 'Hide Row test' }));
		expect(onHide).toHaveBeenCalledTimes(1);
	});

	it('shows the hint of each option as its tooltip', () => {
		render(<AbRow test={testWith(2)} onHide={() => {}} />);
		expect(screen.getByRole('button', { name: 'Option 1' })).toHaveAttribute('title', 'Hint 1');
	});

	it.each([
		[1, 1, '6rem'],
		[3, 3, '6rem'],
		[4, 4, '1fr'],
		[10, 10, '1fr'],
		[11, 10, '1fr'],
		[25, 10, '1fr'],
	])('lays %i options on %i columns, each at least as wide as its label, at most %s', (options, columns, width) => {
		render(<AbRow test={testWith(options)} onHide={() => {}} />);
		expect(group().style.gridTemplateColumns).toBe(`repeat(${columns}, minmax(max-content, ${width}))`);
	});

	it('never caps a column below its label: a long label is not drawn under the next cell', () => {
		render(<AbRow test={testWith(2)} onHide={() => {}} />);
		expect(group().style.gridTemplateColumns).not.toContain('minmax(0');
	});

	it('shares the dock tracks with the other rows and keeps the full label as a tooltip', () => {
		render(<AbRow test={testWith(2)} onHide={() => {}} />);
		const row = group().parentElement!;
		expect(row.style.gridTemplateColumns).toBe('subgrid');
		expect(row.style.gridColumn).toBe('1 / -1');
		expect(screen.getByText('Row test').closest('[title]')).toHaveAttribute('title', 'Row test');
	});
});
