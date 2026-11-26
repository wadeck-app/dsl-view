// The Tooltip card: portaled to the body (never clipped by an ancestor), positioned with flip and clamp, opened after a hover
// delay or on keyboard focus, closed on leave, blur, click, Escape and scroll; one at a time; content can be structured.
// The text for assistive technology is always in the page (visually hidden, role="tooltip"): a disabled button cannot be
// hovered or focused, so its description must not depend on the card being open.
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Tooltip } from './Tooltip.js';

const ROWS = [
	{ label: 'Model', value: 'opus' },
	{ label: 'Tokens', value: '1,200' },
];

const tree = (props: Partial<React.ComponentProps<typeof Tooltip>> = {}) => (
	<Tooltip rows={ROWS} {...props}>
		<button>Agent</button>
	</Tooltip>
);
const trigger = () => screen.getByRole('button', { name: 'Agent' });
const card = () => screen.queryByTestId('tooltip-card');
const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('Tooltip card', () => {
	it('is closed until the pointer has rested on the trigger for the delay', () => {
		render(tree({ delay: 300 }));
		fireEvent.pointerEnter(trigger());
		wait(299);
		expect(card()).toBeNull();
		wait(1);
		expect(card()).toBeInTheDocument();
	});

	it('does not open when the pointer leaves before the delay', () => {
		render(tree({ delay: 300 }));
		fireEvent.pointerEnter(trigger());
		wait(100);
		fireEvent.pointerLeave(trigger());
		wait(500);
		expect(card()).toBeNull();
	});

	it('closes when the pointer leaves', () => {
		render(tree({ delay: 0 }));
		fireEvent.pointerEnter(trigger());
		wait(1);
		expect(card()).toBeInTheDocument();
		fireEvent.pointerLeave(trigger());
		expect(card()).toBeNull();
	});

	it('opens at once on keyboard focus and closes on blur', () => {
		render(tree());
		act(() => trigger().focus());
		expect(card()).toBeInTheDocument();
		act(() => trigger().blur());
		expect(card()).toBeNull();
	});

	it('closes on a click on the trigger', () => {
		render(tree({ delay: 0 }));
		fireEvent.pointerEnter(trigger());
		wait(1);
		fireEvent.click(trigger());
		expect(card()).toBeNull();
	});

	it('closes on Escape', () => {
		render(tree());
		act(() => trigger().focus());
		fireEvent.keyDown(document, { key: 'Escape' });
		expect(card()).toBeNull();
	});

	it('closes when the page scrolls', () => {
		render(tree());
		act(() => trigger().focus());
		fireEvent.scroll(window);
		expect(card()).toBeNull();
	});

	it('renders the rows as labelled pairs in a portal, outside the trigger wrapper', () => {
		const { container } = render(tree());
		act(() => trigger().focus());
		const c = card()!;
		expect(c).toHaveTextContent('Model');
		expect(c).toHaveTextContent('opus');
		expect(c).toHaveTextContent('1,200');
		expect(container.contains(c)).toBe(false);
	});

	it('renders free content (a ReactNode) after the rows', () => {
		render(tree({ content: <p>extra detail</p> }));
		act(() => trigger().focus());
		expect(card()).toHaveTextContent('extra detail');
	});

	it('is hidden from assistive technology itself: the always-present description carries the text', () => {
		render(tree());
		act(() => trigger().focus());
		expect(card()).toHaveAttribute('aria-hidden', 'true');
		const description = screen.getByRole('tooltip');
		expect(description).toHaveTextContent('Model');
		expect(description).toHaveClass('sr-only');
		expect(trigger().getAttribute('aria-describedby')).toBe(description.id);
	});

	it('has the description in the page even while the card is closed (a disabled trigger is never hovered or focused)', () => {
		render(tree({ rows: undefined, content: 'Validate first' }));
		expect(card()).toBeNull();
		expect(trigger()).toHaveAccessibleDescription('Validate first');
	});

	it('never takes pointer events from what is under it, and never takes the focus', () => {
		render(tree());
		act(() => trigger().focus());
		expect(card()).toHaveClass('pointer-events-none');
		expect(document.activeElement).toBe(trigger());
	});

	it('updates its text in place while open (no remount)', () => {
		const { rerender } = render(tree({ rows: [{ label: 'Tokens', value: '1' }] }));
		act(() => trigger().focus());
		const before = card()!;
		rerender(tree({ rows: [{ label: 'Tokens', value: '2' }] }));
		expect(card()).toBe(before);
		expect(before).toHaveTextContent('2');
	});

	it('shows one card at a time', () => {
		render(
			<>
				<Tooltip rows={[{ label: 'A', value: '1' }]}>
					<button>First</button>
				</Tooltip>
				<Tooltip rows={[{ label: 'B', value: '2' }]}>
					<button>Second</button>
				</Tooltip>
			</>
		);
		act(() => screen.getByRole('button', { name: 'First' }).focus());
		act(() => screen.getByRole('button', { name: 'Second' }).focus());
		expect(screen.getAllByTestId('tooltip-card')).toHaveLength(1);
		expect(card()).toHaveTextContent('B');
	});

	it('does not open on a touch pointer (hover does not exist there)', () => {
		// jsdom has no PointerEvent: without one, pointerType is lost.
		class FakePointerEvent extends MouseEvent {
			readonly pointerType: string;
			constructor(type: string, init: PointerEventInit = {}) {
				super(type, init);
				this.pointerType = init.pointerType ?? '';
			}
		}
		vi.stubGlobal('PointerEvent', FakePointerEvent);
		render(tree({ delay: 0 }));
		fireEvent.pointerEnter(trigger(), { pointerType: 'touch' });
		wait(10);
		expect(card()).toBeNull();
	});

	it('is not triggered by an ancestor that happens to carry the class "group"', () => {
		render(
			<div className="group">
				<Tooltip content="Hint">
					<button>Agent</button>
				</Tooltip>
			</div>
		);
		expect(card()).toBeNull();
	});
});
