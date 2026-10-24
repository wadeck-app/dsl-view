import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Card } from './Card.js';

describe('Card as a button (onClick given)', () => {
	it('is a focusable button; without onClick it is a plain container', () => {
		const { rerender } = render(<Card onClick={vi.fn()}>body</Card>);
		const card = screen.getByRole('button');
		expect(card).toHaveAttribute('tabindex', '0');

		rerender(<Card>body</Card>);
		expect(screen.queryByRole('button')).toBeNull();
		expect(screen.getByText('body').parentElement).not.toHaveAttribute('tabindex');
	});

	it('Enter and Space activate it and are prevented (no page scroll on Space); other keys do nothing', () => {
		const onClick = vi.fn();
		render(<Card onClick={onClick}>body</Card>);
		const card = screen.getByRole('button');

		expect(fireEvent.keyDown(card, { key: 'Enter' })).toBe(false);
		expect(fireEvent.keyDown(card, { key: ' ' })).toBe(false);
		expect(onClick).toHaveBeenCalledTimes(2);

		expect(fireEvent.keyDown(card, { key: 'a' })).toBe(true);
		expect(fireEvent.keyDown(card, { key: 'Tab' })).toBe(true);
		expect(onClick).toHaveBeenCalledTimes(2);
	});

	it('typing a space in a field inside the card types it; it neither activates the card nor is swallowed', async () => {
		const onClick = vi.fn();
		render(
			<Card onClick={onClick}>
				<input aria-label="note" />
			</Card>
		);
		const input = screen.getByRole('textbox', { name: 'note' });

		// skipClick: user.type would click the field first, and that click bubbles to the card by design.
		input.focus();
		await userEvent.setup().type(input, 'a b', { skipClick: true });

		expect(input).toHaveValue('a b');
		expect(onClick).not.toHaveBeenCalled();
	});

	it('Enter on a button inside the card still activates that button (the card must not swallow the key)', async () => {
		const onClick = vi.fn();
		const onInner = vi.fn();
		render(
			<Card onClick={onClick}>
				<button type="button" onClick={onInner}>inner</button>
			</Card>
		);
		// The card itself is also a button whose name contains "inner": target the real <button> element.
		const inner = screen.getByText('inner');
		inner.focus();

		await userEvent.setup().keyboard('{Enter}');

		// Before the fix the card's key handler prevented the default action, so the inner button never fired.
		expect(onInner).toHaveBeenCalledTimes(1);
		// The card still sees the inner button's click bubble up, once (that is plain click bubbling, not the key handler).
		expect(onClick).toHaveBeenCalledTimes(1);
	});
});

describe('Card sections', () => {
	it('renders header and footer only when given, around the body', () => {
		const { rerender, container } = render(<Card>body</Card>);
		expect(container.querySelectorAll('.border-b, .border-t')).toHaveLength(0);

		rerender(<Card header={<h3>head</h3>} footer={<p>foot</p>}>body</Card>);
		const text = container.textContent;
		expect(text).toBe('headbodyfoot');
	});

	it('padding "none" adds no padding class; the other steps map to p-3, p-4 and p-6', () => {
		const padded = (padding: 'none' | 'sm' | 'md' | 'lg') => {
			const { container, unmount } = render(<Card padding={padding}>body</Card>);
			const body = screen.getByText('body');
			const className = body.className;
			unmount();
			void container;
			return className;
		};

		expect(padded('none')).toBe('');
		expect(padded('sm')).toBe('p-3');
		expect(padded('md')).toBe('p-4');
		expect(padded('lg')).toBe('p-6');
	});

	it('border and shadow can each be turned off', () => {
		const { container } = render(<Card border={false} shadow={false}>body</Card>);
		const root = container.firstElementChild as HTMLElement;

		expect(root).not.toHaveClass('border');
		expect(root).not.toHaveClass('shadow-sm');
	});
});
