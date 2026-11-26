// The toolbar scale: one control height (border + py-0.5 + a text-xs line = 22px) shared by what sits on one toolbar row:
// SearchBar size="sm", ChipButton, RefreshButton and CompactSelect size="sm". CompactSelect and RefreshButton used to be
// 30px and 26px, so a row of standard components was visibly uneven.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './_Button.js';
import { ChipButton } from './ChipButton.js';
import { CompactSelect } from './CompactSelect.js';
import { RefreshButton } from './RefreshButton.js';
import { SearchBar } from '../table/SearchBar.js';

const OPTIONS = [{ value: 'a', label: 'A' }];

// The classes that decide the height: vertical padding and the text size (line height).
const vertical = (el: Element) => ({
	py: el.className.split(/\s+/).find(c => /^py-/.test(c)),
	text: el.className.split(/\s+/).find(c => /^text-(xs|sm|base)$/.test(c)),
});

describe('toolbar height scale', () => {
	it('RefreshButton, ChipButton, SearchBar sm and CompactSelect sm share the same vertical geometry', () => {
		render(
			<>
				<RefreshButton onClick={vi.fn()} />
				<ChipButton active={false} onClick={vi.fn()}>Chip</ChipButton>
				<SearchBar size="sm" value="" onChange={vi.fn()} aria-label="Search" />
				<CompactSelect ariaLabel="Pick" options={OPTIONS} value="a" onChange={vi.fn()} size="sm" />
			</>
		);
		const geometries = [
			screen.getByRole('button', { name: 'Refresh' }),
			screen.getByRole('button', { name: 'Chip' }),
			screen.getByRole('searchbox'),
			screen.getByRole('combobox', { name: 'Pick' }),
		].map(vertical);
		for (const g of geometries) {
			expect(g).toEqual({ py: 'py-0.5', text: 'text-xs' });
		}
	});

	it('CompactSelect keeps its current size by default', () => {
		render(<CompactSelect ariaLabel="Pick" options={OPTIONS} value="a" onChange={vi.fn()} />);
		expect(vertical(screen.getByRole('combobox'))).toEqual({ py: 'py-1', text: 'text-sm' });
	});

	it('CompactSelect sm uses a smaller chevron and a tighter right padding', () => {
		const { container } = render(<CompactSelect ariaLabel="Pick" options={OPTIONS} value="a" onChange={vi.fn()} size="sm" />);
		expect(container.querySelector('svg')).toHaveClass('h-3', 'w-3');
		expect(screen.getByRole('combobox')).toHaveClass('pr-6');
	});

	it('Button size="xs" is a text action on the same 22px scale (a sm button stays 26px)', () => {
		render(
			<>
				<Button size="xs">Lock</Button>
				<Button size="sm">Save</Button>
			</>
		);
		expect(vertical(screen.getByRole('button', { name: 'Lock' }))).toEqual({ py: 'py-0.5', text: 'text-xs' });
		expect(vertical(screen.getByRole('button', { name: 'Save' }))).toEqual({ py: 'py-1', text: 'text-xs' });
	});
});
