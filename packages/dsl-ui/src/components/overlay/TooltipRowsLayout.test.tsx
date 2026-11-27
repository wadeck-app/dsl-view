// Tooltip `rows`: a long unbreakable value (a path, a shell command) must stay inside the card. The value column may shrink
// (`minmax(0,1fr)`), the value breaks anywhere and reads left to right under its label, a row can be clamped, the card has an edge
// on a dark page, and a module can widen it.
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Tooltip } from './Tooltip.js';

const LONG = '/very/long/unbreakable/path/that/keeps/going/and/going/and/going/forever/without/a/single/space.txt';

function open(props: Partial<React.ComponentProps<typeof Tooltip>> = {}) {
	render(
		<Tooltip rows={[{ label: 'Activity', value: LONG }, { label: 'Model', value: 'opus' }]} {...props}>
			<button>Agent</button>
		</Tooltip>
	);
	act(() => screen.getByRole('button', { name: 'Agent' }).focus());
	return screen.getByTestId('tooltip-card');
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('Tooltip rows layout', () => {
	it('lets the value column shrink below its longest word', () => {
		expect(open().querySelector('dl')).toHaveClass('grid-cols-[auto_minmax(0,1fr)]');
	});

	it('breaks a long value anywhere and aligns it left, under the table reading order', () => {
		const value = open().querySelectorAll('dd')[0]!;
		expect(value).toHaveClass('min-w-0', 'text-left', '[overflow-wrap:anywhere]');
		expect(value).not.toHaveClass('text-right');
	});

	it('clamps a row to the given number of lines', () => {
		const card = open({ rows: [{ label: 'Activity', value: LONG, clamp: 2 }, { label: 'Model', value: 'opus' }] });
		expect(card.querySelectorAll('dd')[0]).toHaveClass('line-clamp-2');
		expect(card.querySelectorAll('dd')[1]).not.toHaveClass('line-clamp-2');
	});

	it('draws an edge so the card stands out on a dark page', () => {
		expect(open()).toHaveClass('ring-1', 'ring-white/15');
	});

	it('is 320px wide at most by default and wider on request', () => {
		expect(open()).toHaveClass('max-w-xs');
	});

	it('maxWidth="md" widens the card', () => {
		const card = open({ maxWidth: 'md' });
		expect(card).toHaveClass('max-w-md');
		expect(card).not.toHaveClass('max-w-xs');
	});
});
