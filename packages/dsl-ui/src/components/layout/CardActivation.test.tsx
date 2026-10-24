import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Card } from './Card.js';

function renderCard(onClick: () => void) {
	return render(
		<Card onClick={onClick} header={<h3>Title</h3>} footer={<a href="#more">More</a>}>
			<p>plain text</p>
			<button type="button">Inner action</button>
			<input aria-label="Inner field" />
			<span role="button" tabIndex={0}>
				Inner custom button
			</span>
			<label>
				Inner label <span>label text</span>
			</label>
		</Card>
	);
}

describe('clickable Card activation', () => {
	it('activates on a click on its own surface and on plain content', () => {
		const onClick = vi.fn();
		renderCard(onClick);
		fireEvent.click(screen.getByText('plain text'));
		fireEvent.click(screen.getByText('Title'));
		expect(onClick).toHaveBeenCalledTimes(2);
	});

	it.each([
		['a native button', () => screen.getByRole('button', { name: 'Inner action' })],
		['a text field', () => screen.getByLabelText('Inner field')],
		['an element with role=button', () => screen.getByText('Inner custom button')],
		['a link in the footer', () => screen.getByRole('link', { name: 'More' })],
	])('does not activate when the click lands on %s inside the card', (_name, target) => {
		const onClick = vi.fn();
		renderCard(onClick);
		fireEvent.click(target());
		expect(onClick).not.toHaveBeenCalled();
	});

	it('does not activate when the click lands on a label (it forwards the click to its control)', () => {
		const onClick = vi.fn();
		renderCard(onClick);
		fireEvent.click(screen.getByText('label text'));
		expect(onClick).not.toHaveBeenCalled();
	});

	it('still activates the card from the keyboard only when the card itself has the focus', () => {
		const onClick = vi.fn();
		const view = renderCard(onClick);
		const card = view.container.firstElementChild as HTMLElement;
		fireEvent.keyDown(card, { key: 'Enter' });
		fireEvent.keyDown(card, { key: ' ' });
		expect(onClick).toHaveBeenCalledTimes(2);
		fireEvent.keyDown(screen.getByLabelText('Inner field'), { key: ' ' });
		fireEvent.keyDown(screen.getByRole('button', { name: 'Inner action' }), { key: 'Enter' });
		expect(onClick).toHaveBeenCalledTimes(2);
	});

	it('does not swallow a space typed in a nested field', () => {
		renderCard(vi.fn());
		const notPrevented = fireEvent.keyDown(screen.getByLabelText('Inner field'), { key: ' ' });
		expect(notPrevented).toBe(true);
	});

	it('is not a button and ignores clicks when it has no onClick', () => {
		const { container } = render(
			<Card>
				<p>static</p>
			</Card>
		);
		expect(screen.queryByRole('button')).toBeNull();
		expect(() => fireEvent.click(container.firstElementChild as HTMLElement)).not.toThrow();
	});
});
