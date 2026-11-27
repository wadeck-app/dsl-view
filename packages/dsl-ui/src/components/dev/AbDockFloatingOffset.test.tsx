// The A/B dock sits at the bottom center of the window, where the floating batch bar of a DataTable also sits. The dock publishes the
// height it takes as the CSS variable `--floating-bottom-offset` on the document root (folded or open, following its size), the
// floating bar lifts by that amount, so the bar is always above the dock, fully visible and clickable. No dock: no variable, no lift.
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DataTable } from '../table/DataTable.js';
import { AbDock, type AbTest } from './AbDock.js';

const VARIABLE = '--floating-bottom-offset';
const offset = () => document.documentElement.style.getPropertyValue(VARIABLE);

function abTest(id: string): AbTest {
	return {
		id,
		label: `Test ${id}`,
		summary: 'o0',
		options: [{ id: 'o0', label: 'A', title: 'A' }, { id: 'o1', label: 'B', title: 'B' }],
		value: 'o0',
		onSelect: () => {},
	};
}

function stubResizeObserver() {
	const state = { callback: (() => {}) as () => void };
	vi.stubGlobal(
		'ResizeObserver',
		class {
			constructor(callback: () => void) {
				state.callback = callback;
			}
			observe(): void {}
			disconnect(): void {}
		}
	);
	return { fire: () => state.callback() };
}

beforeEach(() => localStorage.clear());
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	document.documentElement.style.removeProperty(VARIABLE);
});

describe('AbDock publishes the room it takes', () => {
	it('sets the variable to the frame height plus a gap, and follows its size', () => {
		const observer = stubResizeObserver();
		let height = 120;
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
			return { height: this.dataset['testid'] === 'ab-dock-frame' ? height : 0 } as DOMRect;
		});
		render(<AbDock tests={[abTest('a')]} enabled />);
		expect(offset()).toBe('128px');
		height = 40;
		act(() => observer.fire());
		expect(offset()).toBe('48px');
	});

	it('uses the folded height while the dock is folded', () => {
		localStorage.setItem('ab.collapsed', 'collapsed');
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ height: 32 } as DOMRect);
		render(<AbDock tests={[abTest('a')]} enabled />);
		expect(offset()).toBe('40px');
	});

	it('removes the variable when the dock goes away', () => {
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ height: 50 } as DOMRect);
		const { unmount } = render(<AbDock tests={[abTest('a')]} enabled />);
		expect(offset()).toBe('58px');
		unmount();
		expect(offset()).toBe('');
	});

	it('never sets it when the dock is not enabled (production)', () => {
		render(<AbDock tests={[abTest('a')]} enabled={false} />);
		expect(offset()).toBe('');
	});
});

describe('the floating batch bar lifts above it', () => {
	function tableWithSelection() {
		render(
			<DataTable
				columns={[{ key: 'name', label: 'Name', render: row => String(row['name']) }]}
				rows={[{ id: '1', name: 'one' }]}
				selectable
				batchActions={[{ label: 'Delete selected', action: 'delete' }]}
			/>
		);
		act(() => screen.getAllByRole('checkbox')[1]!.click());
		return screen.getByText('1 selected').parentElement!;
	}

	it('reads the variable, with no lift when it is absent', () => {
		const bar = tableWithSelection();
		expect(bar.className).toContain('bottom-[calc(1.5rem+var(--floating-bottom-offset,0px))]');
		expect(bar.className).not.toContain('bottom-6');
	});
});
