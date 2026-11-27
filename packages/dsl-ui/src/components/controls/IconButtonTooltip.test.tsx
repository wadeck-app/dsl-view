// An IconButton can explain more than its name: `tooltip` replaces the label in the card and then describes the button.
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { IconButton } from './IconButton.js';

describe('IconButton tooltip', () => {
	it('shows the longer text in the card and describes the button by it', () => {
		render(<IconButton icon={<span />} aria-label="Lock" tooltip="Lock the key: you will be asked for the passphrase again" />);
		const button = screen.getByRole('button', { name: 'Lock' });
		expect(button).toHaveAccessibleDescription('Lock the key: you will be asked for the passphrase again');
		act(() => button.focus());
		expect(screen.getByTestId('tooltip-card')).toHaveTextContent('Lock the key: you will be asked for the passphrase again');
	});

	it('without it, the card shows the aria-label and nothing describes the button twice', () => {
		render(<IconButton icon={<span />} aria-label="Lock" />);
		const button = screen.getByRole('button', { name: 'Lock' });
		expect(button).not.toHaveAttribute('aria-describedby');
		act(() => button.focus());
		expect(screen.getByTestId('tooltip-card')).toHaveTextContent('Lock');
	});
});
