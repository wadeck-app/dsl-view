import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider, useToast } from './Toast.js';

function Trigger() {
	const toast = useToast();
	return (
		<>
			<button onClick={() => toast.success('Saved')}>ok</button>
			<button onClick={() => toast.info('FYI')}>info</button>
			<button onClick={() => toast.error('Daemon is not running')}>fail</button>
		</>
	);
}

function setup() {
	render(
		<ToastProvider>
			<Trigger />
		</ToastProvider>
	);
}

describe('ToastProvider', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it('success and info toasts are role=status and auto-dismiss after 4s', () => {
		setup();
		fireEvent.click(screen.getByText('ok'));
		fireEvent.click(screen.getByText('info'));
		expect(screen.getAllByRole('status').map((el) => el.textContent)).toEqual(['Saved', 'FYI']);
		act(() => {
			vi.advanceTimersByTime(4000);
		});
		expect(screen.queryByText('Saved')).toBeNull();
		expect(screen.queryByText('FYI')).toBeNull();
	});

	it('an error toast is role=alert and stays until dismissed', () => {
		setup();
		fireEvent.click(screen.getByText('fail'));
		expect(screen.getByRole('alert').textContent).toContain('Daemon is not running');
		expect(screen.queryByRole('status')).toBeNull();
		act(() => {
			vi.advanceTimersByTime(60_000);
		});
		expect(screen.getByRole('alert')).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('dismissing a persistent error does not affect other toasts', () => {
		setup();
		fireEvent.click(screen.getByText('fail'));
		fireEvent.click(screen.getByText('ok'));
		// The error toast was added first, so its dismiss button is the first one.
		fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss' })[0]!);
		expect(screen.queryByRole('alert')).toBeNull();
		expect(screen.getByRole('status').textContent).toContain('Saved');
	});
});
