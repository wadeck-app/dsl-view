// Fields listed straight in a Card (the showcase reservations form) touched each other and the button below: the padded body now stacks its children with a gap.
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Card } from './Card.js';

const body = (container: HTMLElement) => container.querySelector('[data-testid="child"]')!.parentElement as HTMLElement;

describe('Card body spacing', () => {
	it.each(['sm', 'md', 'lg'] as const)('spaces children at padding %s', padding => {
		const { container } = render(<Card padding={padding}><p data-testid="child">a</p><p>b</p></Card>);
		expect(body(container)).toHaveClass('space-y-4');
	});

	it('keeps padding none edge to edge, without spacing', () => {
		const { container } = render(<Card padding="none"><p data-testid="child">a</p></Card>);
		expect(body(container)).not.toHaveClass('space-y-4');
	});

	it('a filling card body still grows with padding none', () => {
		const { container } = render(<Card padding="none" fill><p data-testid="child">a</p></Card>);
		expect(body(container)).toHaveClass('flex', 'flex-1', 'min-h-0');
	});
});
