import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AbRow } from './AbRow.js';
import type { AbTest } from './abTypes.js';

function testWith(count: number, value = 'o0', onSelect: (id: string) => void = () => {}): AbTest {
	return {
		id: 'row',
		label: 'Row test',
		summary: value,
		value,
		options: Array.from({ length: count }, (_, i) => ({ id: `o${i}`, label: `Option ${i}`, title: `Hint ${i}` })),
		onSelect,
	};
}

const group = () => screen.getByRole('group', { name: 'Row test' });

describe('AbRow', () => {
	it('marks only the current option, in class and in aria-pressed', () => {
		render(<AbRow test={testWith(3, 'o1')} onHide={() => {}} />);
		const buttons = within(group()).getAllByRole('button');
		expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false']);
		expect(buttons.map((b) => b.className.includes('bg-primary-solid'))).toEqual([false, true, false]);
	});

	it('selects an option by its id and hides the test with the eye button', () => {
		const onSelect = vi.fn();
		const onHide = vi.fn();
		render(<AbRow test={testWith(3, 'o0', onSelect)} onHide={onHide} />);
		fireEvent.click(screen.getByRole('button', { name: 'Option 2' }));
		expect(onSelect).toHaveBeenCalledWith('o2');
		fireEvent.click(screen.getByRole('button', { name: 'Hide Row test' }));
		expect(onHide).toHaveBeenCalledTimes(1);
	});

	it('shows the hint of each option as its tooltip', () => {
		render(<AbRow test={testWith(2)} onHide={() => {}} />);
		expect(screen.getByRole('button', { name: 'Option 1' })).toHaveAttribute('title', 'Hint 1');
	});

	it.each([
		[1, 1, '6rem'],
		[3, 3, '6rem'],
		[4, 4, '1fr'],
		[10, 10, '1fr'],
		[11, 10, '1fr'],
		[25, 10, '1fr'],
	])('lays %i options on %i columns, each at least as wide as its label, at most %s', (options, columns, width) => {
		render(<AbRow test={testWith(options)} onHide={() => {}} />);
		expect(group().style.gridTemplateColumns).toBe(`repeat(${columns}, minmax(max-content, ${width}))`);
	});

	it('never caps a column below its label: a long label is not drawn under the next cell', () => {
		render(<AbRow test={testWith(2)} onHide={() => {}} />);
		expect(group().style.gridTemplateColumns).not.toContain('minmax(0');
	});

	it('draws the label at text-xs and the options at text-sm with a 32px-tall target', () => {
		render(<AbRow test={testWith(2)} onHide={() => {}} />);
		const label = screen.getByText('Row test').closest('[title]')!;
		expect(label.className).toContain('text-xs');
		expect(label.className).not.toContain('text-[10px]');
		for (const b of within(group()).getAllByRole('button')) {
			expect(b.className).toContain('text-sm');
			expect(b.className).toContain('py-1.5');
		}
	});

	it('describes each option by its hint without changing its name, and keeps the title', () => {
		render(<AbRow test={testWith(2)} onHide={() => {}} />);
		const second = screen.getByRole('button', { name: 'Option 1' });
		expect(second).toHaveAccessibleName('Option 1');
		expect(second).toHaveAccessibleDescription('Hint 1');
		expect(second).toHaveAttribute('title', 'Hint 1');
		// Explicit reference (the title alone would also give a description in some engines, but not on focus in all of them).
		const describedBy = second.getAttribute('aria-describedby');
		expect(describedBy).toBeTruthy();
		expect(document.getElementById(describedBy!)).toHaveTextContent('Hint 1');
		expect(screen.getByRole('button', { name: 'Option 0' })).toHaveAccessibleDescription('Hint 0');
	});

	describe('hint reporting', () => {
		it('reports the hint on hover and null on leave', () => {
			const onHint = vi.fn();
			render(<AbRow test={testWith(3)} onHide={() => {}} onHint={onHint} />);
			fireEvent.mouseEnter(screen.getByRole('button', { name: 'Option 2' }));
			expect(onHint).toHaveBeenLastCalledWith('Hint 2');
			fireEvent.mouseLeave(screen.getByRole('button', { name: 'Option 2' }));
			expect(onHint).toHaveBeenLastCalledWith(null);
		});

		it('reports the hint on keyboard focus and null on blur', () => {
			const onHint = vi.fn();
			render(<AbRow test={testWith(3)} onHide={() => {}} onHint={onHint} />);
			const button = screen.getByRole('button', { name: 'Option 1' });
			act(() => button.focus());
			expect(onHint).toHaveBeenLastCalledWith('Hint 1');
			act(() => button.blur());
			expect(onHint).toHaveBeenLastCalledWith(null);
		});

		it('shows the hint anyway where the engine does not know :focus-visible', () => {
			const real = Element.prototype.matches;
			vi.spyOn(Element.prototype, 'matches').mockImplementation(function (this: Element, selector: string) {
				if (selector === ':focus-visible') {
					throw new SyntaxError('unknown selector');
				}
				return real.call(this, selector);
			});
			const onHint = vi.fn();
			render(<AbRow test={testWith(3)} onHide={() => {}} onHint={onHint} />);
			act(() => screen.getByRole('button', { name: 'Option 1' }).focus());
			expect(onHint).toHaveBeenLastCalledWith('Hint 1');
		});

		it('works without a listener', () => {
			render(<AbRow test={testWith(3)} onHide={() => {}} />);
			fireEvent.mouseEnter(screen.getByRole('button', { name: 'Option 1' }));
			expect(screen.getByRole('button', { name: 'Option 1' })).toBeInTheDocument();
		});
	});

	describe('scrolling the chosen option into view', () => {
		afterEach(() => {
			delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView;
		});
		const stubScroll = () => {
			const spy = vi.fn();
			(HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView = spy;
			return spy;
		};

		it('scrolls the chosen option, and only it, with nearest alignment when the row mounts', () => {
			const spy = stubScroll();
			render(<AbRow test={testWith(11, 'o9')} onHide={() => {}} />);
			expect(spy).toHaveBeenCalledTimes(1);
			expect(spy).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' });
			expect(spy.mock.contexts[0]).toBe(screen.getByRole('button', { name: 'Option 9' }));
		});

		it('scrolls again when the choice changes, to the new option', () => {
			const spy = stubScroll();
			const { rerender } = render(<AbRow test={testWith(11, 'o0')} onHide={() => {}} />);
			rerender(<AbRow test={testWith(11, 'o10')} onHide={() => {}} />);
			expect(spy).toHaveBeenCalledTimes(2);
			expect(spy.mock.contexts[1]).toBe(screen.getByRole('button', { name: 'Option 10' }));
		});

		it('does not scroll on a re-render that keeps the choice', () => {
			const spy = stubScroll();
			const { rerender } = render(<AbRow test={testWith(11, 'o3')} onHide={() => {}} />);
			rerender(<AbRow test={testWith(11, 'o3')} onHide={() => {}} />);
			expect(spy).toHaveBeenCalledTimes(1);
		});

		it('waits for the dock to be unfolded (a hidden dock has no layout), then scrolls', () => {
			const spy = stubScroll();
			const { rerender } = render(<AbRow test={testWith(11, 'o8')} onHide={() => {}} folded />);
			expect(spy).not.toHaveBeenCalled();
			rerender(<AbRow test={testWith(11, 'o8')} onHide={() => {}} folded={false} />);
			expect(spy).toHaveBeenCalledTimes(1);
		});

		it('reveals the chosen option again when the row is resized, and stops observing on unmount', () => {
			const spy = stubScroll();
			let callback: () => void = () => {};
			const disconnect = vi.fn();
			const observed: Element[] = [];
			vi.stubGlobal(
				'ResizeObserver',
				class {
					constructor(cb: () => void) {
						callback = cb;
					}
					observe(el: Element): void {
						observed.push(el);
					}
					disconnect(): void {
						disconnect();
					}
				}
			);
			const { unmount } = render(<AbRow test={testWith(11, 'o9')} onHide={() => {}} />);
			expect(observed).toEqual([group(), screen.getByRole("button", { name: "Option 9" })]);
			expect(spy).toHaveBeenCalledTimes(1);
			act(() => callback());
			expect(spy).toHaveBeenCalledTimes(2);
			expect(spy.mock.contexts[1]).toBe(screen.getByRole('button', { name: 'Option 9' }));
			unmount();
			expect(disconnect).toHaveBeenCalledTimes(1);
		});

		it('does not fail where scrollIntoView does not exist', () => {
			expect((HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView).toBeUndefined();
			render(<AbRow test={testWith(3, 'o1')} onHide={() => {}} />);
			expect(screen.getByRole('button', { name: 'Option 1' })).toHaveAttribute('aria-pressed', 'true');
		});
	});

	it('shares the dock tracks with the other rows and keeps the full label as a tooltip', () => {
		render(<AbRow test={testWith(2)} onHide={() => {}} />);
		const row = group().parentElement!;
		expect(row.style.gridTemplateColumns).toBe('subgrid');
		expect(row.style.gridColumn).toBe('1 / -1');
		expect(screen.getByText('Row test').closest('[title]')).toHaveAttribute('title', 'Row test');
	});
});
