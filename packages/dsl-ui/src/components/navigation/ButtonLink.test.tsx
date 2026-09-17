import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { ButtonLink } from './ButtonLink.js';
import { buttonClasses } from '../controls/_Button.js';
import { ButtonAction } from '../controls/ButtonAction.js';

function renderLink(props: Partial<React.ComponentProps<typeof ButtonLink>> = {}) {
	return render(
		<MemoryRouter>
			<ButtonLink to="/logs" label="View logs" {...props} />
		</MemoryRouter>
	);
}

describe('ButtonLink', () => {
	// An anchor, not a button: middle-click and copy-link have to work on a navigation.
	it('renders a link, not a button', () => {
		renderLink();

		expect(screen.getByRole('link', { name: 'View logs' })).toHaveAttribute('href', '/logs');
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('renders a leading icon without displacing the accessible name', () => {
		renderLink({ icon: <svg data-testid="file" /> });

		const link = screen.getByRole('link', { name: 'View logs' });
		expect(link.firstElementChild).toHaveAttribute('data-testid', 'file');
	});

	// The whole point: this cannot drift from Button, because both read the same builder.
	// Three hand-rolled copies of a button-shaped link had already drifted to a different
	// width and corner radius from the ButtonAction sitting beside them.
	it('takes its geometry from the shared button classes', () => {
		renderLink({ variant: 'neutral', size: 'md' });

		expect(screen.getByRole('link').className).toBe(buttonClasses('neutral', 'md'));
	});

	it('matches a ButtonAction of the same size box for box', () => {
		renderLink({ size: 'sm' });
		const linkCls = screen.getByRole('link').className;

		render(<ButtonAction label="Run" size="sm" />);
		const btnCls = screen.getByRole('button').className;

		const box = (cls: string) =>
			cls.split(' ').filter(c => /^(px-|py-|text-(xs|sm)$|border$|rounded)/.test(c)).sort().join(' ');
		expect(box(linkCls)).toBe(box(btnCls));
	});

	it('defaults to a secondary md control', () => {
		renderLink();

		expect(screen.getByRole('link').className).toBe(buttonClasses('secondary', 'md'));
	});
});
