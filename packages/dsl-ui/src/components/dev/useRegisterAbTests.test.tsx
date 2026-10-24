import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import React, { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { AbExperiments } from './AbExperiments.js';
import { isDev } from './isDev.js';
import { useAbTest } from './useAbTest.js';
import { useRegisterAbTests } from './useRegisterAbTests.js';

vi.mock('./isDev.js', () => ({ isDev: vi.fn(() => false) }));

const options = { a: { label: 'A', hint: 'first' }, b: { label: 'B', hint: 'second' } };

// A host component deep in the tree: its test is declared here, not where <AbExperiments> is mounted.
function Deep({ id = 'deep', label = 'Deep test', onRender }: { id?: string; label?: string; onRender?: () => void }) {
	const test = useAbTest({ id, label, initial: 'a', options });
	onRender?.();
	// A new array on every render, on purpose.
	useRegisterAbTests([test]);
	return <p data-testid={`value-${id}`}>{test.value}</p>;
}

const rowOf = (name: string) => within(screen.getByRole('group', { name }));

let errorSpy: MockInstance<typeof console.error>;
let warnSpy: MockInstance<typeof console.warn>;

beforeEach(() => {
	localStorage.clear();
	window.history.pushState({}, '', '/');
	vi.mocked(isDev).mockReturnValue(false);
	errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe('useRegisterAbTests', () => {
	it('shows a test declared below <AbExperiments> in its single dock, and a click changes the value', () => {
		render(
			<AbExperiments enabled>
				<Deep />
			</AbExperiments>
		);
		expect(screen.getAllByTestId('ab-dock')).toHaveLength(1);
		expect(rowOf('Deep test').getByRole('button', { name: 'A' })).toHaveAttribute('aria-pressed', 'true');
		fireEvent.click(rowOf('Deep test').getByRole('button', { name: 'B' }));
		expect(screen.getByTestId('value-deep')).toHaveTextContent('b');
		expect(rowOf('Deep test').getByRole('button', { name: 'B' })).toHaveAttribute('aria-pressed', 'true');
		expect(localStorage.getItem('ab.deep')).toBe('b');
	});

	it('does not loop when the array is recreated on every render', () => {
		const onRender = vi.fn();
		render(
			<AbExperiments enabled>
				<Deep onRender={onRender} />
			</AbExperiments>
		);
		const afterMount = onRender.mock.calls.length;
		// One click = one value change = a bounded number of extra renders, not a runaway loop.
		fireEvent.click(rowOf('Deep test').getByRole('button', { name: 'B' }));
		expect(onRender.mock.calls.length - afterMount).toBeLessThanOrEqual(3);
		expect(errorSpy).not.toHaveBeenCalled();
	});

	it('keeps several tests in the array order and removes a row when its test leaves the array', () => {
		function Two() {
			const [both, setBoth] = useState(true);
			const first = useAbTest({ id: 'one', label: 'One', initial: 'a', options });
			const second = useAbTest({ id: 'two', label: 'Two', initial: 'a', options });
			useRegisterAbTests(both ? [first, second] : [first]);
			return <button onClick={() => setBoth(false)}>drop</button>;
		}
		render(
			<AbExperiments enabled>
				<Two />
			</AbExperiments>
		);
		expect(screen.getAllByRole('group').map((g) => g.getAttribute('aria-label'))).toEqual(['One', 'Two']);
		fireEvent.click(screen.getByRole('button', { name: 'drop' }));
		expect(screen.getAllByRole('group').map((g) => g.getAttribute('aria-label'))).toEqual(['One']);
	});

	it('removes the row when the component unmounts', () => {
		function Toggle() {
			const [shown, setShown] = useState(true);
			return (
				<>
					<button onClick={() => setShown(false)}>unmount</button>
					{shown ? <Deep id="gone" label="Gone" /> : null}
				</>
			);
		}
		render(
			<AbExperiments enabled>
				<Toggle />
			</AbExperiments>
		);
		expect(screen.getByRole('group', { name: 'Gone' })).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: 'unmount' }));
		expect(screen.queryByRole('group', { name: 'Gone' })).not.toBeInTheDocument();
	});

	it('refuses a second, different test under the same id and reports the id', () => {
		render(
			<AbExperiments enabled>
				<Deep id="same" label="First" />
				<Deep id="same" label="Second" />
			</AbExperiments>
		);
		expect(screen.getAllByRole('group').map((g) => g.getAttribute('aria-label'))).toEqual(['First']);
		expect(errorSpy.mock.calls.some(([m]) => String(m).includes('"same"'))).toBe(true);
	});

	it('shares one row between identical declarations', () => {
		render(
			<AbExperiments enabled>
				<Deep id="twin" label="Twin" />
				<Deep id="twin" label="Twin" />
			</AbExperiments>
		);
		expect(screen.getAllByRole('group')).toHaveLength(1);
		expect(errorSpy).not.toHaveBeenCalled();
	});

	it('registers nothing while experiments are off', () => {
		render(
			<AbExperiments enabled={false}>
				<Deep />
			</AbExperiments>
		);
		expect(screen.queryByTestId('ab-dock')).not.toBeInTheDocument();
	});

	it('without <AbExperiments>, says so once in development and still applies the stored choice', () => {
		vi.mocked(isDev).mockReturnValue(true);
		localStorage.setItem('ab.deep', 'b');
		const { rerender } = render(<Deep />);
		expect(screen.getByTestId('value-deep')).toHaveTextContent('b');
		act(() => rerender(<Deep />));
		const calls = warnSpy.mock.calls.filter(([m]) => String(m).includes('useRegisterAbTests'));
		expect(calls).toHaveLength(1);
		expect(String(calls[0]![0])).toContain('<AbExperiments>');
	});

	it('without <AbExperiments> outside development stays silent (nothing to show)', () => {
		render(<Deep id="quiet" />);
		expect(warnSpy.mock.calls.filter(([m]) => String(m).includes('useRegisterAbTests'))).toHaveLength(0);
	});

	it('with <AbExperiments> in development stays silent: there is a dock', async () => {
		// The warning is said once per page: an earlier test may have used it up, so load a fresh copy of the whole graph
		// (hook and host share one context) where nothing was said yet.
		vi.resetModules();
		vi.doMock('./isDev.js', () => ({ isDev: () => true }));
		const { AbExperiments: FreshHost } = await import('./AbExperiments.js');
		const { useRegisterAbTests: fresh } = await import('./useRegisterAbTests.js');
		function Docked() {
			fresh([]);
			return null;
		}
		render(
			<FreshHost enabled>
				<Docked />
			</FreshHost>
		);
		vi.doUnmock('./isDev.js');
		vi.resetModules();
		expect(warnSpy.mock.calls.filter(([m]) => String(m).includes('useRegisterAbTests'))).toHaveLength(0);
	});

	it('says so only once per page, however many components mount without a dock', async () => {
		// The "already said" memory lives in the module: load a fresh copy so that earlier tests do not count.
		vi.resetModules();
		vi.doMock('./isDev.js', () => ({ isDev: () => true }));
		const { useRegisterAbTests: fresh } = await import('./useRegisterAbTests.js');
		function Bare() {
			fresh([]);
			return null;
		}
		render(<Bare />);
		render(<Bare />);
		vi.doUnmock('./isDev.js');
		vi.resetModules();
		expect(warnSpy.mock.calls.filter(([m]) => String(m).includes('useRegisterAbTests'))).toHaveLength(1);
	});
});
