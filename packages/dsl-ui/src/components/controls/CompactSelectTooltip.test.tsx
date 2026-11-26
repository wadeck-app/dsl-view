// A label-less select can say more than its aria-label: `tooltip` shows a hint through the Tooltip (no native title).
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CompactSelect } from './CompactSelect.js';

const OPTIONS = [{ value: 'a', label: 'A' }];

describe('CompactSelect tooltip', () => {
	it('shows the hint on keyboard focus and describes the select by it', () => {
		render(<CompactSelect ariaLabel="Keep unlocked for" options={OPTIONS} value="a" onChange={vi.fn()} tooltip="How long the key stays unlocked" />);
		const select = screen.getByRole('combobox', { name: 'Keep unlocked for' });
		expect(select).toHaveAccessibleDescription('How long the key stays unlocked');
		act(() => select.focus());
		expect(screen.getByTestId('tooltip-card')).toHaveTextContent('How long the key stays unlocked');
		expect(select).not.toHaveAttribute('title');
	});

	it('has no tooltip wrapper without the prop', () => {
		render(<CompactSelect ariaLabel="Pick" options={OPTIONS} value="a" onChange={vi.fn()} />);
		expect(screen.queryByRole('tooltip')).toBeNull();
	});
});
