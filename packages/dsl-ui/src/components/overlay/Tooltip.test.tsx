import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { Button } from '../controls/_Button.js';
import { Tooltip } from './Tooltip.js';

// A hover-only tooltip is invisible to a keyboard or screen-reader user unless the wrapped control points at it:
// a DISABLED button (the main use, "why can't I click this") cannot take focus at all, so the description is the only
// way the reason reaches assistive technology.
describe('Tooltip accessibility', () => {
	it('describes its single element child with the tooltip text', () => {
		render(
			<Tooltip content="Validate the payload first">
				<button>Push</button>
			</Tooltip>
		);
		const button = screen.getByRole('button', { name: 'Push' });
		expect(button).toHaveAccessibleDescription('Validate the payload first');
		expect(button.getAttribute('aria-describedby')).toBe(screen.getByRole('tooltip').id);
	});

	it('keeps a description the child already has and adds its own', () => {
		render(
			<>
				<span id="own">Own help</span>
				<Tooltip content="Extra">
					<button aria-describedby="own">Push</button>
				</Tooltip>
			</>
		);
		expect(screen.getByRole('button', { name: 'Push' })).toHaveAccessibleDescription('Own help Extra');
	});

	it('gives each tooltip its own id', () => {
		render(
			<>
				<Tooltip content="A"><button>One</button></Tooltip>
				<Tooltip content="B"><button>Two</button></Tooltip>
			</>
		);
		const [a, b] = screen.getAllByRole('tooltip');
		expect(a!.id).not.toBe('');
		expect(a!.id).not.toBe(b!.id);
		expect(screen.getByRole('button', { name: 'One' })).toHaveAccessibleDescription('A');
		expect(screen.getByRole('button', { name: 'Two' })).toHaveAccessibleDescription('B');
	});

	it('leaves children that are not a single element untouched', () => {
		render(
			<Tooltip content="Hint">
				text only
			</Tooltip>
		);
		expect(screen.getByRole('tooltip')).toHaveTextContent('Hint');
	});

	it('a disabled Button exposes its disabledReason as its accessible description', () => {
		render(<Button disabled disabledReason="Validate the payload first">Push</Button>);
		const button = screen.getByRole('button', { name: 'Push' });
		expect(button).toBeDisabled();
		expect(button).toHaveAccessibleDescription('Validate the payload first');
	});
});
