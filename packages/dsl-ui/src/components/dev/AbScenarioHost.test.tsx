// A host that runs experiments for a scenario picker: a row whose options are known when the page mounts, an action button on the row
// (reset), and a switch that keeps the `<AbTest>` nodes of the views out of the dock.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import React, { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AbExperiments } from './AbExperiments.js';
import { AbTest } from './AbTest.js';
import type { AbTest as DockTest } from './abTypes.js';
import { useRegisterAbTests } from './useRegisterAbTests.js';

vi.mock('./isDev.js', () => ({ isDev: vi.fn(() => false) }));

beforeEach(() => {
	localStorage.clear();
	window.history.pushState({}, '', '/');
});
afterEach(cleanup);

// The page's scenarios are only known when it mounts: the options are built from props, per page.
function ScenarioRow({ scenarios, onReset }: { scenarios: string[]; onReset: () => void }) {
	const [value, setValue] = useState(scenarios[0]!);
	const test: DockTest = {
		id: 'scenario.page',
		label: 'Scenario',
		summary: value,
		value,
		options: scenarios.map(id => ({ id, label: id, title: `the ${id} state` })),
		onSelect: setValue,
		actions: [{ id: 'reset', label: 'Reset', title: 'Back to the start of this scenario', onClick: onReset }],
	};
	useRegisterAbTests([test]);
	return <p data-testid="current">{value}</p>;
}

const row = () => within(screen.getByRole('group', { name: 'Scenario' }));

describe('a dock row with per-page options and an action', () => {
	it('shows the options of this page and runs the action without changing the choice', () => {
		const onReset = vi.fn();
		render(
			<AbExperiments enabled>
				<ScenarioRow scenarios={['empty', 'one pending']} onReset={onReset} />
			</AbExperiments>
		);
		expect(row().getAllByRole('button', { pressed: undefined }).map(b => b.textContent)).toEqual(['empty', 'one pending', 'Reset']);
		fireEvent.click(row().getByRole('button', { name: 'one pending' }));
		expect(screen.getByTestId('current')).toHaveTextContent('one pending');
		fireEvent.click(row().getByRole('button', { name: 'Reset' }));
		expect(onReset).toHaveBeenCalledTimes(1);
		expect(screen.getByTestId('current')).toHaveTextContent('one pending');
	});

	it('another page brings other options: the row follows', () => {
		const { rerender } = render(
			<AbExperiments enabled>
				<ScenarioRow key="a" scenarios={['empty']} onReset={vi.fn()} />
			</AbExperiments>
		);
		rerender(
			<AbExperiments enabled>
				<ScenarioRow key="b" scenarios={['signing', 'result']} onReset={vi.fn()} />
			</AbExperiments>
		);
		expect(row().getAllByRole('button').map(b => b.textContent)).toEqual(['signing', 'result', 'Reset']);
	});

	it('the Reset button is not a pressed option', () => {
		render(
			<AbExperiments enabled>
				<ScenarioRow scenarios={['empty']} onReset={vi.fn()} />
			</AbExperiments>
		);
		expect(row().getByRole('button', { name: 'Reset' })).not.toHaveAttribute('aria-pressed');
	});
});

describe('viewTests=false', () => {
	const node = (
		<AbTest
			id="look"
			label="Look"
			initial="a"
			variants={{ a: { label: 'A', hint: 'first', view: { x: 1 } }, b: { label: 'B', hint: 'second', view: { x: 2 } } }}
			renderNode={view => <span data-testid="view">{JSON.stringify(view)}</span>}
		/>
	);

	it('keeps view A/B nodes out of the dock and on their initial variant, while code tests still show', () => {
		localStorage.setItem('ab.look', 'b');
		render(
			<AbExperiments enabled viewTests={false}>
				{node}
				<ScenarioRow scenarios={['empty']} onReset={vi.fn()} />
			</AbExperiments>
		);
		expect(screen.getByTestId('view')).toHaveTextContent('{"x":1}');
		expect(screen.queryByRole('group', { name: 'Look' })).not.toBeInTheDocument();
		expect(screen.getByRole('group', { name: 'Scenario' })).toBeInTheDocument();
	});

	it('is on by default', () => {
		localStorage.setItem('ab.look', 'b');
		render(<AbExperiments enabled>{node}</AbExperiments>);
		expect(screen.getByTestId('view')).toHaveTextContent('{"x":2}');
	});
});
