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

describe('ToastProvider timers', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it('announces each toast on its own, politely, in a region that is not read as a whole', () => {
		setup();
		const region = document.querySelector('[aria-live]')!;
		expect(region).toHaveAttribute('aria-live', 'polite');
		expect(region).toHaveAttribute('aria-atomic', 'false');
	});

	it('drops the auto-dismiss timer of a toast the user dismissed first', () => {
		setup();
		fireEvent.click(screen.getByText('ok'));
		expect(vi.getTimerCount()).toBe(1);
		fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
		expect(screen.queryByRole('status')).toBeNull();
		expect(vi.getTimerCount()).toBe(0);
	});

	it('leaves no timer behind when the provider unmounts', () => {
		const { unmount } = render(
			<ToastProvider>
				<Trigger />
			</ToastProvider>
		);
		fireEvent.click(screen.getByText('ok'));
		fireEvent.click(screen.getByText('info'));
		expect(vi.getTimerCount()).toBe(2);
		unmount();
		expect(vi.getTimerCount()).toBe(0);
	});

	it('starts no timer for an error, which stays until dismissed', () => {
		setup();
		fireEvent.click(screen.getByText('fail'));
		expect(vi.getTimerCount()).toBe(0);
	});
});

describe('useToast consumers', () => {
	it('do not re-render when a toast comes or goes (the context value is stable)', () => {
		let renders = 0;
		function Counting() {
			const toast = useToast();
			renders++;
			return <button onClick={() => toast.success('Saved')}>ok</button>;
		}
		render(
			<ToastProvider>
				<Counting />
			</ToastProvider>
		);
		const before = renders;
		fireEvent.click(screen.getByText('ok'));
		fireEvent.click(screen.getByText('ok'));
		expect(screen.getAllByRole('status')).toHaveLength(2);
		expect(renders).toBe(before);
	});

	it('throws a clear error outside a provider', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		function Bare() {
			useToast();
			return null;
		}
		expect(() => render(<Bare />)).toThrow('useToast must be used inside <ToastProvider>');
		error.mockRestore();
	});
});
