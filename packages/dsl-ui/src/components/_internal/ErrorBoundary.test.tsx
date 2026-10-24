import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from './ErrorBoundary.js';

function Boom({ message = 'kaboom' }: { message?: string }): React.ReactElement {
	throw new Error(message);
}

// React logs every caught render error itself; silence that noise but keep the spy to assert our own report.
function silenceReactErrorLog() {
	return vi.spyOn(console, 'error').mockImplementation(() => undefined);
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
	it('renders its children untouched when nothing throws', () => {
		render(
			<ErrorBoundary>
				<p>all good</p>
			</ErrorBoundary>
		);

		expect(screen.getByText('all good')).toBeInTheDocument();
		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('shows an alert with the error message instead of the crashed subtree', () => {
		silenceReactErrorLog();
		render(
			<ErrorBoundary>
				<p>sibling of the crash</p>
				<Boom message="table exploded" />
			</ErrorBoundary>
		);

		const alert = screen.getByRole('alert');
		expect(alert).toHaveTextContent('Something went wrong');
		expect(alert).toHaveTextContent('table exploded');
		expect(screen.queryByText('sibling of the crash')).toBeNull();
	});

	it('reports the error and the component stack to the console under its own prefix', () => {
		const consoleError = silenceReactErrorLog();
		render(
			<ErrorBoundary>
				<Boom message="reported" />
			</ErrorBoundary>
		);

		const own = consoleError.mock.calls.find(call => call[0] === '[ErrorBoundary] Uncaught error:');
		expect(own).toBeDefined();
		expect((own![1] as Error).message).toBe('reported');
		expect(typeof own![2]).toBe('string');
		expect(own![2]).toContain('Boom');
	});

	it('renders the custom fallback instead of the default alert when one is given', () => {
		silenceReactErrorLog();
		render(
			<ErrorBoundary fallback={<p>custom fallback</p>}>
				<Boom />
			</ErrorBoundary>
		);

		expect(screen.getByText('custom fallback')).toBeInTheDocument();
		expect(screen.queryByRole('alert')).toBeNull();
	});

	describe('resetKeys', () => {
		// Throws only for the "bad" record, so changing the key to a good one must recover.
		function Record({ id }: { id: string }): React.ReactElement {
			if (id === 'bad') throw new Error('bad record');
			return <p>record {id}</p>;
		}

		it('a crashed boundary tries its children again when a reset key changes', () => {
			silenceReactErrorLog();
			const { rerender } = render(
				<ErrorBoundary resetKeys={['bad']}>
					<Record id="bad" />
				</ErrorBoundary>
			);
			expect(screen.getByRole('alert')).toHaveTextContent('bad record');

			rerender(
				<ErrorBoundary resetKeys={['good']}>
					<Record id="good" />
				</ErrorBoundary>
			);

			expect(screen.getByText('record good')).toBeInTheDocument();
			expect(screen.queryByRole('alert')).toBeNull();
		});

		it('stays on the error when the keys are unchanged, also when the keys array is a new array with the same entries', () => {
			silenceReactErrorLog();
			const { rerender } = render(
				<ErrorBoundary resetKeys={['bad']}>
					<Record id="bad" />
				</ErrorBoundary>
			);

			rerender(
				<ErrorBoundary resetKeys={['bad']}>
					<Record id="good" />
				</ErrorBoundary>
			);

			expect(screen.getByRole('alert')).toHaveTextContent('bad record');
			expect(screen.queryByText('record good')).toBeNull();
		});

		it('without resetKeys a crashed boundary never resets on its own (previous behaviour)', () => {
			silenceReactErrorLog();
			const { rerender } = render(
				<ErrorBoundary>
					<Record id="bad" />
				</ErrorBoundary>
			);

			rerender(
				<ErrorBoundary>
					<Record id="good" />
				</ErrorBoundary>
			);

			expect(screen.getByRole('alert')).toHaveTextContent('bad record');
		});

		it('a key change that still crashes retries once and then keeps the fallback instead of looping', () => {
			const consoleError = silenceReactErrorLog();
			const { rerender } = render(
				<ErrorBoundary resetKeys={['bad']}>
					<Record id="bad" />
				</ErrorBoundary>
			);
			consoleError.mockClear();

			rerender(
				<ErrorBoundary resetKeys={['bad2']}>
					<Record id="bad" />
				</ErrorBoundary>
			);

			expect(screen.getByRole('alert')).toHaveTextContent('bad record');
			const own = consoleError.mock.calls.filter(call => call[0] === '[ErrorBoundary] Uncaught error:');
			expect(own).toHaveLength(1);
		});

		it('a length change counts as a change, and NaN keys are equal to themselves', () => {
			silenceReactErrorLog();
			const { rerender } = render(
				<ErrorBoundary resetKeys={[Number.NaN]}>
					<Record id="bad" />
				</ErrorBoundary>
			);

			rerender(
				<ErrorBoundary resetKeys={[Number.NaN]}>
					<Record id="good" />
				</ErrorBoundary>
			);
			expect(screen.getByRole('alert')).toHaveTextContent('bad record');

			rerender(
				<ErrorBoundary resetKeys={[Number.NaN, 'extra']}>
					<Record id="good" />
				</ErrorBoundary>
			);
			expect(screen.getByText('record good')).toBeInTheDocument();
		});
	});

	it('the Reload button reloads the page', async () => {
		silenceReactErrorLog();
		const reload = vi.fn();
		const original = window.location;
		Object.defineProperty(window, 'location', { configurable: true, value: { ...original, reload } });
		try {
			render(
				<ErrorBoundary>
					<Boom />
				</ErrorBoundary>
			);

			await userEvent.setup().click(screen.getByRole('button', { name: 'Reload' }));

			expect(reload).toHaveBeenCalledTimes(1);
		} finally {
			Object.defineProperty(window, 'location', { configurable: true, value: original });
		}
	});
});
