// While a save runs, an animated `loadingStyle` keeps the label (so the button keeps its size) and the button is busy, not "off".
// Without a style the buttons keep their "Saving..." label.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ActionButton } from '../controls/ActionButton.js';
import { ButtonSave } from './ButtonSave.js';
import { ButtonSubmit } from './ButtonSubmit.js';
import { Form } from './Form.js';

describe('ButtonSave while saving', () => {
	it('keeps its label with an animated style, and is busy', () => {
		render(<ButtonSave isPending loadingStyle="orbit" />);
		expect(screen.getByRole('button')).toHaveTextContent('Save');
		expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
		expect(screen.getByRole('button')).toBeDisabled();
	});

	it('says "Saving..." without a style (unchanged)', () => {
		render(<ButtonSave isPending />);
		expect(screen.getByRole('button')).toHaveTextContent('Saving...');
	});

	it('is still off, with its reason, when there is nothing to save', () => {
		render(<ButtonSave hasChanges={false} loadingStyle="dots" />);
		expect(screen.getByRole('button')).toBeDisabled();
		expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy');
	});
});

describe('ButtonSubmit while the form saves', () => {
	it('keeps its label with an animated style', async () => {
		render(
			<Form initialData={{}} onSubmit={() => new Promise(() => undefined)} fields={[]} actions={<ButtonSubmit label="Reserve" loadingStyle="sweep" />} />
		);
		screen.getByRole('button', { name: 'Reserve' }).click();
		expect(await screen.findByRole('button', { name: 'Reserve' })).toHaveAttribute('aria-busy', 'true');
	});
});

describe('ActionButton while its action runs', () => {
	it('keeps its icon with an animated style, and drops it with the spinner', () => {
		const { rerender } = render(<ActionButton action="a" label="Push" icon="rocket" onAction={vi.fn()} actionPending={{ a: true }} loadingStyle="bar" />);
		expect(screen.getByRole('button', { name: 'Push' }).querySelectorAll('svg')).toHaveLength(1);
		rerender(<ActionButton action="a" label="Push" icon="rocket" onAction={vi.fn()} actionPending={{ a: true }} />);
		// The spinner arrives after its delay; until then the icon is already gone, as before.
		expect(screen.getByRole('button', { name: 'Push' }).querySelectorAll('svg')).toHaveLength(0);
	});
});
