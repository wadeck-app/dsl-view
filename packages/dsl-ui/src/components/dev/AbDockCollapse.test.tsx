import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AbDock, COLLAPSED_DOCK_KEY, HIDDEN_TESTS_KEY } from './AbDock.js';
import { AbExperiments } from './AbExperiments.js';
import { useAbTest } from './useAbTest.js';

const OPTIONS = {
	red: { label: 'Red', hint: 'Paints it red, a longer explanation.' },
	blue: { label: 'Blue', hint: 'Paints it blue, a longer explanation.' },
} as const;

let applied: string | undefined;

function Harness({ enabled = true }: { enabled?: boolean }) {
	const color = useAbTest({ id: 'color', label: 'Fake color', options: OPTIONS, initial: 'red' });
	const size = useAbTest({ id: 'size', label: 'Fake size', options: OPTIONS, initial: 'red' });
	applied = color.value;
	return (
		<div>
			<button type="button">outside</button>
			<AbDock tests={[color, size]} enabled={enabled} />
		</div>
	);
}

const dock = () => screen.getByTestId('ab-dock');
const pill = () => screen.getByRole('button', { name: /Show the A\/B tests/ });
const foldButton = () => screen.getByRole('button', { name: 'Fold the A/B tests' });

beforeEach(() => {
	localStorage.clear();
	applied = undefined;
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('AbDock collapse', () => {
	it('starts open, with no pill', () => {
		render(<Harness />);
		expect(dock()).toBeVisible();
		expect(screen.queryByRole('button', { name: /Show the A\/B tests/ })).not.toBeInTheDocument();
		expect(foldButton()).toHaveAttribute('aria-expanded', 'true');
	});

	it('folds into a pill "A/B (N)" counting every test, and unfolds on click', () => {
		render(<Harness />);
		fireEvent.click(foldButton());
		expect(dock()).not.toBeVisible();
		expect(pill()).toHaveTextContent('A/B (2)');
		expect(pill()).toHaveAttribute('aria-expanded', 'false');
		expect(pill()).toHaveAttribute('aria-controls', dock().id);
		fireEvent.click(pill());
		expect(dock()).toBeVisible();
		expect(screen.queryByRole('button', { name: /Show the A\/B tests/ })).not.toBeInTheDocument();
	});

	it('counts hidden rows too', () => {
		localStorage.setItem(HIDDEN_TESTS_KEY, JSON.stringify(['size']));
		render(<Harness />);
		fireEvent.click(foldButton());
		expect(pill()).toHaveTextContent('A/B (2)');
	});

	it('keeps every choice applied while folded', () => {
		render(<Harness />);
		fireEvent.click(screen.getAllByRole('button', { name: 'Blue' })[0]!);
		expect(applied).toBe('blue');
		fireEvent.click(foldButton());
		expect(applied).toBe('blue');
		fireEvent.click(pill());
		expect(applied).toBe('blue');
	});

	it('remembers the folded state after a reload, under ab.collapsed', () => {
		const first = render(<Harness />);
		fireEvent.click(foldButton());
		expect(localStorage.getItem(COLLAPSED_DOCK_KEY)).toBe('collapsed');
		first.unmount();
		render(<Harness />);
		expect(dock()).not.toBeVisible();
		expect(pill()).toBeInTheDocument();
		fireEvent.click(pill());
		expect(localStorage.getItem(COLLAPSED_DOCK_KEY)).toBe('open');
	});

	it('reports an invalid stored value instead of silently ignoring it, and stays open', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		localStorage.setItem(COLLAPSED_DOCK_KEY, 'sideways');
		render(<Harness />);
		expect(dock()).toBeVisible();
		expect(warn).toHaveBeenCalledWith(expect.stringContaining(`[ab] Ignoring unknown dock state "sideways" in localStorage "${COLLAPSED_DOCK_KEY}"`));
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('open, collapsed'));
	});

	it('follows a change made in another tab', () => {
		render(<Harness />);
		act(() => {
			localStorage.setItem(COLLAPSED_DOCK_KEY, 'collapsed');
			window.dispatchEvent(new StorageEvent('storage', { key: COLLAPSED_DOCK_KEY, newValue: 'collapsed', storageArea: localStorage }));
		});
		expect(dock()).not.toBeVisible();
	});

	it('does not read the storage for the dock state when the dock is disabled', () => {
		localStorage.setItem(COLLAPSED_DOCK_KEY, 'collapsed');
		const get = vi.spyOn(Storage.prototype, 'getItem');
		render(<Harness enabled={false} />);
		expect(screen.queryByTestId('ab-dock')).not.toBeInTheDocument();
		expect(get).not.toHaveBeenCalledWith(COLLAPSED_DOCK_KEY);
	});
});

describe('AbDock Escape', () => {
	it('folds the dock when Escape is pressed with the focus inside it, and moves the focus to the pill', () => {
		render(<Harness />);
		const blue = screen.getAllByRole('button', { name: 'Blue' })[0]!;
		blue.focus();
		fireEvent.keyDown(blue, { key: 'Escape' });
		expect(dock()).not.toBeVisible();
		expect(pill()).toHaveFocus();
	});

	it('does nothing when Escape is pressed with the focus outside the dock', () => {
		render(<Harness />);
		const outside = screen.getByRole('button', { name: 'outside' });
		outside.focus();
		fireEvent.keyDown(outside, { key: 'Escape' });
		expect(dock()).toBeVisible();
		expect(outside).toHaveFocus();
	});

	it('ignores other keys inside the dock', () => {
		render(<Harness />);
		fireEvent.keyDown(screen.getAllByRole('button', { name: 'Blue' })[0]!, { key: 'Enter' });
		expect(dock()).toBeVisible();
	});

	it('moves the focus back to the fold button after unfolding with the pill', () => {
		render(<Harness />);
		fireEvent.click(foldButton());
		fireEvent.click(pill());
		expect(foldButton()).toHaveFocus();
	});
});

describe('AbExperiments dock', () => {
	it('has the same fold control (the host-owned single dock)', () => {
		function Host() {
			const t = useAbTest({ id: 'host', label: 'Host test', options: OPTIONS, initial: 'red' });
			return (
				<AbExperiments enabled tests={[t]}>
					<span>app</span>
				</AbExperiments>
			);
		}
		render(<Host />);
		fireEvent.click(foldButton());
		expect(pill()).toHaveTextContent('A/B (1)');
		expect(screen.getByText('app')).toBeInTheDocument();
	});
});
