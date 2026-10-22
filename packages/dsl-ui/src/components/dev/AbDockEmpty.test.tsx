import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AbDock, COLLAPSED_DOCK_KEY } from './AbDock.js';
import { AbExperiments } from './AbExperiments.js';
import { useAbTest } from './useAbTest.js';
import { useRegisterAbTests } from './useRegisterAbTests.js';

vi.mock('./isDev.js', () => ({ isDev: vi.fn(() => false) }));

const options = { a: { label: 'A', hint: 'first' }, b: { label: 'B', hint: 'second' } };

// Registers its test only while mounted, so the dock sees the last test come and go.
function Late() {
	const test = useAbTest({ id: 'late', label: 'Late test', initial: 'a', options });
	useRegisterAbTests([test]);
	return null;
}

function Toggle() {
	const [on, setOn] = useState(false);
	return (
		<>
			<button type="button" onClick={() => setOn((v) => !v)}>
				toggle
			</button>
			{on ? <Late /> : null}
		</>
	);
}

const noDockAtAll = () => {
	expect(screen.queryByTestId('ab-dock')).toBeNull();
	expect(screen.queryByRole('button', { name: /A\/B tests/ })).toBeNull();
};

beforeEach(() => {
	localStorage.clear();
	window.history.pushState({}, '', '/');
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe('A/B dock with no test', () => {
	it('AbDock with tests=[] renders nothing', () => {
		const { container } = render(<AbDock tests={[]} enabled />);
		expect(container).toBeEmptyDOMElement();
	});

	it('AbExperiments with no test and no AbTest node renders no chevron and no pill', () => {
		render(
			<AbExperiments enabled>
				<p>page</p>
			</AbExperiments>
		);
		noDockAtAll();
	});

	it('renders nothing even when a collapsed state is stored, and leaves that state untouched', () => {
		localStorage.setItem(COLLAPSED_DOCK_KEY, 'collapsed');
		render(
			<AbExperiments enabled>
				<p>page</p>
			</AbExperiments>
		);
		noDockAtAll();
		expect(localStorage.getItem(COLLAPSED_DOCK_KEY)).toBe('collapsed');
	});

	it('appears when a test registers late and disappears again when the last one unregisters', () => {
		render(
			<AbExperiments enabled>
				<Toggle />
			</AbExperiments>
		);
		noDockAtAll();
		fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
		expect(screen.getByTestId('ab-dock')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Fold the A/B tests' })).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
		noDockAtAll();
	});

	it('shows the pill, not nothing, once a test exists and the stored state is collapsed', () => {
		localStorage.setItem(COLLAPSED_DOCK_KEY, 'collapsed');
		render(
			<AbExperiments enabled>
				<Toggle />
			</AbExperiments>
		);
		noDockAtAll();
		act(() => {
			fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
		});
		expect(screen.getByRole('button', { name: /Show the A\/B tests \(1\)/ })).toBeInTheDocument();
	});
});
