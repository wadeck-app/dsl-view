// Gaps reported by a module that kept its own wrappers: an icon button with no tooltip card, a text field that keeps the caller's id and
// ARIA and takes an icon, a search bar with a width and an accessible name, a router-aware link that truncates, a button action that
// says whether it is expanded.
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { ButtonAction } from './controls/ButtonAction.js';
import { IconButton } from './controls/IconButton.js';
import { FieldText } from './form/FieldText.js';
import { AppLink } from './navigation/AppLink.js';
import { SearchBar } from './table/SearchBar.js';

describe('IconButton tooltip: false', () => {
	// The card is shown on focus or hover and is not part of the accessible tree: look for its text outside the button.
	const cardText = () => screen.queryAllByText('Open').filter(node => node.closest('button') === null);

	it('renders the button with its accessible name and no tooltip card', () => {
		render(<IconButton icon={<span>i</span>} aria-label="Open" tooltip={false} />);
		act(() => screen.getByRole('button', { name: 'Open' }).focus());
		expect(cardText()).toHaveLength(0);
	});

	it('still has the tooltip card by default', () => {
		render(<IconButton icon={<span>i</span>} aria-label="Open" />);
		act(() => screen.getByRole('button', { name: 'Open' }).focus());
		expect(cardText().length).toBeGreaterThan(0);
	});
});

describe('FieldText keeps what the caller wrote', () => {
	it('uses the id the caller gave, for the input and the label', () => {
		render(<FieldText label="Name" value="" onChange={vi.fn()} id="my-name" />);
		expect(screen.getByLabelText('Name')).toHaveAttribute('id', 'my-name');
	});

	it('keeps the caller aria-describedby and adds the error message to it', () => {
		render(<FieldText label="Name" value="" onChange={vi.fn()} id="n" aria-describedby="hint" error="Too short" />);
		expect(screen.getByLabelText('Name')).toHaveAttribute('aria-describedby', 'hint n-error');
	});

	it('keeps a caller aria attribute the wrapper has nothing to say about', () => {
		render(<FieldText label="Name" value="" onChange={vi.fn()} aria-invalid aria-describedby="hint" />);
		expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
		expect(screen.getByLabelText('Name')).toHaveAttribute('aria-describedby', 'hint');
	});

	it('shows an icon inside the field without changing the accessible name', () => {
		render(<FieldText label="Name" value="" onChange={vi.fn()} icon={<svg data-testid="glass" />} />);
		expect(screen.getByTestId('glass').parentElement).toHaveAttribute('aria-hidden', 'true');
		expect(screen.getByLabelText('Name')).toHaveClass('pl-9');
	});
});

describe('SearchBar', () => {
	const bar = (props: Record<string, unknown>) => render(<SearchBar value="" onChange={vi.fn()} {...props} />);

	it.each([['sm', 'w-40'], ['md', 'w-52'], ['lg', 'w-72'], ['full', 'w-full']] as const)('width %s', (width, cls) => {
		bar({ width });
		expect(screen.getByRole('search')).toHaveClass(cls);
	});

	it('names the input from ariaLabel, else from the placeholder', () => {
		bar({ ariaLabel: 'Filter sessions', placeholder: 'Type…', ariaDescribedBy: 'help' });
		expect(screen.getByRole('searchbox', { name: 'Filter sessions' })).toHaveAttribute('aria-describedby', 'help');
	});
});

describe('AppLink truncate', () => {
	it('is a router link that cuts one line with an ellipsis', () => {
		render(
			<MemoryRouter>
				<AppLink href="/sessions/1" truncate>
					a very long session name
				</AppLink>
			</MemoryRouter>
		);
		const link = screen.getByRole('link');
		expect(link).toHaveAttribute('href', '/sessions/1');
		expect(link).toHaveClass('truncate', 'block', 'min-w-0');
	});
});

describe('ButtonAction disclosure state', () => {
	it('sets aria-expanded and aria-controls', () => {
		render(<ButtonAction label="Details" ariaExpanded ariaControls="panel" />);
		expect(screen.getByRole('button', { name: 'Details' })).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByRole('button', { name: 'Details' })).toHaveAttribute('aria-controls', 'panel');
	});

	it('writes neither without them', () => {
		render(<ButtonAction label="Details" />);
		expect(screen.getByRole('button')).not.toHaveAttribute('aria-expanded');
	});
});

describe('FieldText ref and data attributes', () => {
	it('hands the input to a ref and passes data-* attributes through', () => {
		const ref = { current: null as HTMLInputElement | null };
		render(<FieldText label="Name" value="" onChange={vi.fn()} ref={ref} data-agent-search="x" />);
		expect(ref.current).toBe(screen.getByLabelText('Name'));
		expect(screen.getByLabelText('Name')).toHaveAttribute('data-agent-search', 'x');
	});
});

describe('ChipButton without active', () => {
	it('is a plain button with no pressed state', async () => {
		const { ChipButton } = await import('./controls/ChipButton.js');
		render(<ChipButton onClick={vi.fn()}>label</ChipButton>);
		expect(screen.getByRole('button', { name: 'label' })).not.toHaveAttribute('aria-pressed');
	});
});
