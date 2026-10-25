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
		// Newest first.
		expect(screen.getAllByRole('status').map((el) => el.textContent)).toEqual([expect.stringContaining('FYI'), expect.stringContaining('Saved')]);
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
		// The error toast was added first, so with the newest on top its dismiss button is the last one.
		fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss' }).at(-1)!);
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
		// The second identical toast folds into the first (Saved ×2): one status, and still no consumer re-render.
		expect(screen.getByRole('status').textContent).toContain('Saved ×2');
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

describe('ToastProvider stack', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	function Many() {
		const toast = useToast();
		return (
			<>
				{[1, 2, 3, 4, 5, 6, 7].map((n) => (
					<button key={n} onClick={() => toast.error(`error ${n}`)}>
						e{n}
					</button>
				))}
				<button onClick={() => toast.success('Saved')}>ok</button>
			</>
		);
	}
	const setupMany = () =>
		render(
			<ToastProvider>
				<Many />
			</ToastProvider>
		);
	const shown = () => screen.queryAllByRole('alert').map((el) => el.textContent ?? '');

	it('folds an identical toast right after the previous one into a count', () => {
		setup();
		fireEvent.click(screen.getByText('fail'));
		fireEvent.click(screen.getByText('fail'));
		fireEvent.click(screen.getByText('fail'));
		expect(screen.getAllByRole('alert')).toHaveLength(1);
		expect(screen.getByRole('alert').textContent).toContain('Daemon is not running ×3');
	});

	it('does not fold toasts that differ by variant or text, nor ones separated by another toast', () => {
		setup();
		fireEvent.click(screen.getByText('fail'));
		fireEvent.click(screen.getByText('ok'));
		fireEvent.click(screen.getByText('fail'));
		expect(screen.getAllByRole('alert')).toHaveLength(2);
		expect(screen.getAllByRole('alert').every((el) => !/×d/.test(el.textContent ?? ''))).toBe(true);
	});

	it('restarts the auto-dismiss of a folded success, with a single timer', () => {
		setup();
		fireEvent.click(screen.getByText('ok'));
		act(() => {
			vi.advanceTimersByTime(3000);
		});
		fireEvent.click(screen.getByText('ok'));
		expect(vi.getTimerCount()).toBe(1);
		act(() => {
			vi.advanceTimersByTime(3000);
		});
		expect(screen.getByRole('status').textContent).toContain('Saved ×2');
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(screen.queryByRole('status')).toBeNull();
	});

	it('shows five toasts at most, newest first, and folds the older errors behind "+N more" without dropping one', () => {
		setupMany();
		for (let n = 1; n <= 7; n++) {
			fireEvent.click(screen.getByText(`e${n}`));
		}
		expect(shown()).toEqual([7, 6, 5, 4, 3].map((n) => expect.stringContaining(`error ${n}`)));
		const more = screen.getByRole('button', { name: '+2 more' });
		expect(more).toHaveAttribute('aria-expanded', 'false');
		fireEvent.click(more);
		expect(shown()).toHaveLength(7);
		expect(shown()[6]).toContain('error 1');
		const fewer = screen.getByRole('button', { name: 'Show fewer' });
		expect(fewer).toHaveAttribute('aria-expanded', 'true');
		fireEvent.click(fewer);
		expect(shown()).toHaveLength(5);
	});

	it('shows no fold control up to five toasts', () => {
		setupMany();
		for (let n = 1; n <= 5; n++) {
			fireEvent.click(screen.getByText(`e${n}`));
		}
		expect(shown()).toHaveLength(5);
		expect(screen.queryByRole('button', { name: /more|fewer/i })).toBeNull();
	});

	it('brings the next older toast into view when a shown one is dismissed', () => {
		setupMany();
		for (let n = 1; n <= 6; n++) {
			fireEvent.click(screen.getByText(`e${n}`));
		}
		expect(shown().some((text) => text.includes('error 1'))).toBe(false);
		fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss' })[0]!);
		expect(shown()).toHaveLength(5);
		expect(shown().some((text) => text.includes('error 1'))).toBe(true);
		expect(screen.queryByRole('button', { name: /more/i })).toBeNull();
	});
});
