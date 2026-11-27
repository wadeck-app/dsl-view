// The wrapper accepts a class and data attributes (a module sizes it), and only a scroll that moves the trigger closes the card:
// a live log scrolling elsewhere must not.
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Tooltip } from './Tooltip.js';

const card = () => screen.queryByTestId('tooltip-card');

describe('Tooltip wrapper pass-through', () => {
	it('puts className and data attributes on the wrapper span', () => {
		render(
			<Tooltip content="Hint" className="w-full" data-kind="chip">
				<button>Agent</button>
			</Tooltip>
		);
		const wrapper = screen.getByRole('button', { name: 'Agent' }).parentElement as HTMLElement;
		expect(wrapper).toHaveClass('inline-flex', 'w-full');
		expect(wrapper).toHaveAttribute('data-kind', 'chip');
	});
});

describe('Tooltip scroll', () => {
	function setup() {
		render(
			<div>
				<div data-testid="log">
					<p>line</p>
				</div>
				<div data-testid="ancestor">
					<Tooltip content="Hint">
						<button>Agent</button>
					</Tooltip>
				</div>
			</div>
		);
		act(() => screen.getByRole('button', { name: 'Agent' }).focus());
		expect(card()).toBeInTheDocument();
	}

	it('stays open when something that does not contain the trigger scrolls', () => {
		setup();
		fireEvent.scroll(screen.getByTestId('log'));
		expect(card()).toBeInTheDocument();
	});

	it('closes when a scrolling ancestor of the trigger scrolls', () => {
		setup();
		fireEvent.scroll(screen.getByTestId('ancestor'));
		expect(card()).toBeNull();
	});

	it('closes when the page scrolls', () => {
		setup();
		fireEvent.scroll(window);
		expect(card()).toBeNull();
	});

	it('closes when the document scrolls', () => {
		setup();
		fireEvent.scroll(document);
		expect(card()).toBeNull();
	});
});
