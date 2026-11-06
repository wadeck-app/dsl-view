import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AbDock, type AbTest } from './AbDock.js';

function testWith(id: string, count = 3, parentId?: string): AbTest {
	return {
		id,
		label: `Test ${id}`,
		summary: 'o0',
		options: Array.from({ length: count }, (_, i) => ({ id: `o${i}`, label: `${id} option ${i}`, title: `${id} hint ${i}` })),
		value: 'o0',
		onSelect: () => {},
		...(parentId === undefined ? {} : { parentId }),
	};
}

const frame = () => screen.getByTestId('ab-dock-frame');
const spacer = () => screen.getByTestId('ab-dock-spacer');
const optionButton = (name: string) => screen.getByRole('button', { name });

beforeEach(() => {
	localStorage.clear();
	window.history.pushState({}, '', '/');
});

describe('AbDock narrow windows', () => {
	it('is never wider than its strip nor than the window minus a margin', () => {
		render(<AbDock tests={[testWith('a')]} enabled />);
		expect(screen.getByTestId('ab-dock').parentElement!.style.maxWidth).toBe('min(100%, calc(100vw - 1rem))');
	});

	it('caps the label at 6rem below 640px (20rem or 40% of the window from there up) and cuts it with an ellipsis', () => {
		render(<AbDock tests={[testWith('a')]} enabled />);
		const label = screen.getByText('Test a');
		const cell = label.closest('[title]')!;
		expect(cell.className.split(' ')).toContain('max-w-24');
		expect(cell.className.split(' ')).toContain('sm:max-w-[min(20rem,40vw)]');
		expect(cell).toHaveAttribute('title', 'Test a');
		expect(label.className.split(' ')).toEqual(expect.arrayContaining(['truncate']));
	});

	it('gives the label column no minimum width below 640px, 10rem from there up (no wide empty label on a phone)', () => {
		render(<AbDock tests={[testWith('a')]} enabled />);
		const classes = screen.getByTestId('ab-dock').className.split(' ');
		expect(classes).toContain('grid-cols-[minmax(0,max-content)_minmax(0,1fr)]');
		expect(classes).toContain('sm:grid-cols-[minmax(10rem,max-content)_minmax(0,1fr)]');
		expect(screen.getByTestId('ab-dock').style.gridTemplateColumns).toBe('');
	});

	it('leaves 0.5rem on each side of the strip below 640px (1rem from there up)', () => {
		render(<AbDock tests={[testWith('a')]} enabled />);
		expect(frame().className.split(' ')).toEqual(expect.arrayContaining(['px-2', 'sm:px-4']));
		expect(frame().className.split(' ')).not.toContain('px-4');
	});

	it('keeps each row scrollable sideways', () => {
		render(<AbDock tests={[testWith('a', 11)]} enabled />);
		expect(screen.getByRole('group', { name: 'Test a' }).className).toContain('overflow-x-auto');
	});
});

describe('AbDock end-of-page room', () => {
	function stubResizeObserver(): { fire: () => void; disconnect: ReturnType<typeof vi.fn>; observed: Element[] } {
		const state = { callback: (() => {}) as () => void, disconnect: vi.fn(), observed: [] as Element[] };
		vi.stubGlobal(
			'ResizeObserver',
			class {
				constructor(callback: () => void) {
					state.callback = callback;
				}
				observe(el: Element): void {
					state.observed.push(el);
				}
				disconnect(): void {
					state.disconnect();
				}
			}
		);
		return { fire: () => state.callback(), disconnect: state.disconnect, observed: state.observed };
	}

	it('reserves the height of the frame plus its distance to the window bottom, and follows its size', () => {
		const observer = stubResizeObserver();
		let height = 120;
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
			return { height: this === frame() ? height : 0 } as DOMRect;
		});
		render(<AbDock tests={[testWith('a')]} enabled />);
		expect(spacer().style.height).toBe('calc(120px + 1.5rem)');
		expect(observer.observed).toEqual([frame()]);
		height = 40.2;
		act(() => observer.fire());
		expect(spacer().style.height).toBe('calc(41px + 1.5rem)');
	});

	it('reserves only the folded height while the dock is folded', () => {
		localStorage.setItem('ab.collapsed', 'collapsed');
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ height: 32 } as DOMRect);
		render(<AbDock tests={[testWith('a')]} enabled />);
		expect(spacer().style.height).toBe('calc(32px + 1.5rem)');
	});

	it('is empty and hidden from assistive tech', () => {
		render(<AbDock tests={[testWith('a')]} enabled />);
		expect(spacer()).toHaveAttribute('aria-hidden', 'true');
		expect(spacer()).toBeEmptyDOMElement();
	});

	it('stops observing when the dock unmounts', () => {
		const observer = stubResizeObserver();
		const { unmount } = render(<AbDock tests={[testWith('a')]} enabled />);
		expect(observer.disconnect).not.toHaveBeenCalled();
		unmount();
		expect(observer.disconnect).toHaveBeenCalledTimes(1);
	});

	it('works where ResizeObserver does not exist (measured once, no error)', () => {
		vi.stubGlobal('ResizeObserver', undefined);
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ height: 70 } as DOMRect);
		render(<AbDock tests={[testWith('a')]} enabled />);
		expect(spacer().style.height).toBe('calc(70px + 1.5rem)');
	});

	it.each([
		['experiments are off', <AbDock key="off" tests={[testWith('a')]} enabled={false} />],
		['there is no test', <AbDock key="none" tests={[]} enabled />],
	])('reserves nothing when %s', (_name, ui) => {
		render(ui);
		expect(screen.queryByTestId('ab-dock-spacer')).not.toBeInTheDocument();
		expect(screen.queryByTestId('ab-dock-frame')).not.toBeInTheDocument();
	});
});

describe('AbDock row order', () => {
	const groupNames = () => screen.getAllByRole('group').map((g) => g.getAttribute('aria-label'));

	it('shows a nested test ABOVE its parent: the parent row (the one just clicked) is the last of the dock', () => {
		render(<AbDock tests={[testWith('outer'), testWith('inner', 3, 'outer')]} enabled />);
		expect(groupNames()).toEqual(['Test inner', 'Test outer']);
	});

	it('keeps the other tests in the given order around a nested pair', () => {
		render(<AbDock tests={[testWith('first'), testWith('outer'), testWith('inner', 3, 'outer'), testWith('last')]} enabled />);
		expect(groupNames()).toEqual(['Test first', 'Test inner', 'Test outer', 'Test last']);
	});

	it('hides a nested row without moving its parent, and the reminder chips stay above all rows', () => {
		render(<AbDock tests={[testWith('outer'), testWith('inner', 3, 'outer')]} enabled />);
		fireEvent.click(screen.getByRole('button', { name: 'Hide Test inner' }));
		expect(groupNames()).toEqual(['Test outer']);
		const chip = screen.getByRole('button', { name: 'Show Test inner' });
		const outer = screen.getByRole('group', { name: 'Test outer' });
		expect(chip.compareDocumentPosition(outer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});
});

describe('AbDock option hint', () => {
	const hintLine = () => screen.queryByTestId('ab-dock-hint');

	it('shows the hint of the option under the pointer, and removes it when the pointer leaves', () => {
		render(<AbDock tests={[testWith('a')]} enabled />);
		expect(hintLine()).not.toBeInTheDocument();
		fireEvent.mouseEnter(optionButton('a option 1'));
		expect(hintLine()).toHaveTextContent('a hint 1');
		fireEvent.mouseLeave(optionButton('a option 1'));
		expect(hintLine()).not.toBeInTheDocument();
	});

	it('shows the hint of the option holding the keyboard focus, and removes it on blur', () => {
		render(<AbDock tests={[testWith('a')]} enabled />);
		act(() => optionButton('a option 2').focus());
		expect(hintLine()).toHaveTextContent('a hint 2');
		act(() => optionButton('a option 2').blur());
		expect(hintLine()).not.toBeInTheDocument();
	});

	it('does not show it for a focus that is not from the keyboard (a click focuses the button)', () => {
		const real = Element.prototype.matches;
		vi.spyOn(Element.prototype, 'matches').mockImplementation(function (this: Element, selector: string) {
			return selector === ':focus-visible' ? false : real.call(this, selector);
		});
		render(<AbDock tests={[testWith('a')]} enabled />);
		act(() => optionButton('a option 2').focus());
		expect(hintLine()).not.toBeInTheDocument();
	});

	it('does not move any row: it is drawn over the page, not in the dock grid, and hidden from assistive tech (the description carries it)', () => {
		render(<AbDock tests={[testWith('a')]} enabled />);
		fireEvent.mouseEnter(optionButton('a option 0'));
		const hint = hintLine()!;
		expect(hint).toHaveAttribute('aria-hidden', 'true');
		expect(hint.className).toContain('absolute');
		expect(screen.getByTestId('ab-dock').contains(hint)).toBe(false);
	});

	it('is gone once the dock is folded by Escape, and does not come back on unfolding', () => {
		render(<AbDock tests={[testWith('a')]} enabled />);
		act(() => optionButton('a option 1').focus());
		expect(hintLine()).toBeInTheDocument();
		fireEvent.keyDown(optionButton('a option 1'), { key: 'Escape' });
		expect(hintLine()).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: /Show the A\/B tests/ }));
		expect(hintLine()).not.toBeInTheDocument();
	});

	it('is gone when the row of the hovered option is hidden', () => {
		render(<AbDock tests={[testWith('a'), testWith('b')]} enabled />);
		fireEvent.mouseEnter(optionButton('a option 1'));
		fireEvent.click(screen.getByRole('button', { name: 'Hide Test a' }));
		expect(hintLine()).not.toBeInTheDocument();
	});

	it('gives each option its hint as accessible description, without changing its name, and keeps the title', () => {
		render(<AbDock tests={[testWith('a'), testWith('b')]} enabled />);
		const a1 = within(screen.getByRole('group', { name: 'Test a' })).getByRole('button', { name: 'a option 1' });
		expect(a1).toHaveAccessibleName('a option 1');
		expect(a1).toHaveAccessibleDescription('a hint 1');
		expect(a1).toHaveAttribute('title', 'a hint 1');
		const b1 = within(screen.getByRole('group', { name: 'Test b' })).getByRole('button', { name: 'b option 1' });
		expect(b1).toHaveAccessibleDescription('b hint 1');
	});
});
