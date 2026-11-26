// Repeated row actions need a name of their own ("Allow <command>") and the toolbar size: ButtonAction and ActionButton take
// `ariaLabel` (spelled like CompactSelect's: the entries generator skips aria-* props, so the DOM spelling would be
// unreachable from a DSL page) and `size="xs"`.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ActionButton } from './ActionButton.js';
import { ButtonAction } from './ButtonAction.js';

describe('ButtonAction ariaLabel and xs', () => {
	it('ariaLabel is the accessible name while the visible text stays the label', () => {
		render(<ButtonAction label="Allow" ariaLabel="Allow git status" />);
		const button = screen.getByRole('button', { name: 'Allow git status' });
		expect(button).toHaveTextContent('Allow');
	});

	it('without ariaLabel the name is the label (unchanged)', () => {
		render(<ButtonAction label="Allow" />);
		expect(screen.getByRole('button', { name: 'Allow' })).not.toHaveAttribute('aria-label');
	});

	it('size xs is the 22px toolbar size', () => {
		render(<ButtonAction label="Lock" size="xs" />);
		expect(screen.getByRole('button', { name: 'Lock' })).toHaveClass('py-0.5', 'text-xs');
	});
});

describe('ActionButton ariaLabel and xs', () => {
	it('ariaLabel is the accessible name', () => {
		render(<ActionButton action="allow" label="Allow" ariaLabel="Allow git status" onAction={() => undefined} />);
		expect(screen.getByRole('button', { name: 'Allow git status' })).toHaveTextContent('Allow');
	});

	it('size xs is the 22px toolbar size', () => {
		render(<ActionButton action="lock" label="Lock" size="xs" onAction={() => undefined} />);
		expect(screen.getByRole('button', { name: 'Lock' })).toHaveClass('py-0.5', 'text-xs');
	});

	it('an icon-only xs button is the smallest icon size', () => {
		render(<ActionButton action="lock" label="Lock" icon="Lock" iconOnly size="xs" onAction={() => undefined} />);
		expect(screen.getByRole('button', { name: 'Lock' })).toHaveClass('h-5', 'w-5');
	});
});
