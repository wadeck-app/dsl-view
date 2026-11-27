// A quiet button (no filled or outlined chrome) for list rows, disclosure headers and footers: still a real button element.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ButtonAction } from './ButtonAction.js';

describe('ButtonAction quiet variants', () => {
	it('ghost is a real button with no fill and no border', async () => {
		const onClick = vi.fn();
		render(<ButtonAction label="Details" variant="ghost" onClick={onClick} />);
		const button = screen.getByRole('button', { name: 'Details' });
		expect(button.tagName).toBe('BUTTON');
		expect(button.className).not.toMatch(/(^|\s)bg-(primary|danger|success)\b/);
		// The border is there for the geometry (same size as the other variants) but transparent.
		expect(button).toHaveClass('border-transparent');
		expect(button.className).not.toMatch(/(^|\s)border-(border|danger)\b/);
		await userEvent.setup().click(button);
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it('neutral and link are accepted too', () => {
		render(
			<>
				<ButtonAction label="N" variant="neutral" />
				<ButtonAction label="L" variant="link" />
			</>
		);
		expect(screen.getByRole('button', { name: 'N' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'L' })).toBeInTheDocument();
	});
});
