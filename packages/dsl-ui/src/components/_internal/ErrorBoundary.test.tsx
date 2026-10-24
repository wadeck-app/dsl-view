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
