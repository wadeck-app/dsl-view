import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

import { ActionBanner } from './ActionBanner.js';
import { ActionBannerEntry } from './ActionBannerEntry.js';
import { NotifierProvider, useBannerNotifier, useNotifier } from './notifier.js';
import type { BannerItem } from './notifier.js';

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('useBannerNotifier', () => {
	it('numbers notifications in order and keeps only the three most recent', () => {
		const { result } = renderHook(() => useBannerNotifier());
		act(() => {
			for (const message of ['one', 'two', 'three', 'four']) {
				result.current.notify({ kind: 'error', message });
			}
		});
		expect(result.current.items.map(i => i.message)).toEqual(['two', 'three', 'four']);
		expect(result.current.items.map(i => i.id)).toEqual([2, 3, 4]);
	});

	it('dismisses exactly the requested item and never reuses its id', () => {
		const { result } = renderHook(() => useBannerNotifier());
		act(() => {
			result.current.notify({ kind: 'success', message: 'a' });
			result.current.notify({ kind: 'error', message: 'b' });
		});
		act(() => result.current.dismiss(1));
		expect(result.current.items.map(i => i.message)).toEqual(['b']);
		act(() => result.current.notify({ kind: 'error', message: 'c' }));
		expect(result.current.items.map(i => i.id)).toEqual([2, 3]);
	});

	it('keeps the same notify and dismiss functions across renders (they are used as effect dependencies)', () => {
		const { result, rerender } = renderHook(() => useBannerNotifier());
		const { notify, dismiss } = result.current;
		act(() => notify({ kind: 'success', message: 'x' }));
		rerender();
		expect(result.current.notify).toBe(notify);
		expect(result.current.dismiss).toBe(dismiss);
	});
});

describe('NotifierProvider / useNotifier', () => {
	it('hands the host callback to descendants', () => {
		const notify = vi.fn();
		const { result } = renderHook(() => useNotifier(), {
			wrapper: ({ children }) => <NotifierProvider notify={notify}>{children}</NotifierProvider>,
		});
		expect(result.current).toBe(notify);
	});

	it('throws an actionable error outside any notifier instead of notifying into the void', () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		expect(() => renderHook(() => useNotifier())).toThrow('[useNotifier] No notifier available. Render inside a <GenericPageRunner>');
		expect(() => renderHook(() => useNotifier())).toThrow('<NotifierProvider notify={...}>');
	});
});

const item = (over: Partial<BannerItem> = {}): BannerItem => ({ id: 7, kind: 'success', message: 'Saved', ...over });

describe('ActionBannerEntry', () => {
	it('dismisses a success by itself after exactly 5 seconds, not before', () => {
		vi.useFakeTimers();
		const onDismiss = vi.fn();
		render(<ActionBannerEntry item={item()} onDismiss={onDismiss} />);
		vi.advanceTimersByTime(4999);
		expect(onDismiss).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(onDismiss).toHaveBeenCalledTimes(1);
		expect(onDismiss).toHaveBeenCalledWith(7);
	});

	it('never dismisses an error by itself: the user must read and close it', () => {
		vi.useFakeTimers();
		const onDismiss = vi.fn();
		render(<ActionBannerEntry item={item({ kind: 'error', message: 'Daemon is not running' })} onDismiss={onDismiss} />);
		vi.advanceTimersByTime(60_000);
		expect(onDismiss).not.toHaveBeenCalled();
	});

	it('cancels the pending auto-dismiss when it unmounts', () => {
		vi.useFakeTimers();
		const onDismiss = vi.fn();
		const view = render(<ActionBannerEntry item={item()} onDismiss={onDismiss} />);
		view.unmount();
		vi.advanceTimersByTime(10_000);
		expect(onDismiss).not.toHaveBeenCalled();
	});

	it('announces an error as an alert and a success as a status, with the HTTP status when there is one', () => {
		const { rerender } = render(<ActionBannerEntry item={item({ kind: 'error', message: 'Boom', status: 503 })} onDismiss={vi.fn()} />);
		const alert = screen.getByRole('alert');
		expect(alert.textContent).toContain('Boom (HTTP 503)');
		expect(alert.getAttribute('data-action-feedback')).toBe('error');
		rerender(<ActionBannerEntry item={item({ kind: 'success', message: 'Fine' })} onDismiss={vi.fn()} />);
		const status = screen.getByRole('status');
		expect(status.textContent).toContain('Fine');
		expect(status.textContent).not.toContain('HTTP');
		expect(status.getAttribute('data-action-feedback')).toBe('success');
	});

	it('shows a status of 0 as well (only an absent status is hidden)', () => {
		render(<ActionBannerEntry item={item({ kind: 'error', status: 0 })} onDismiss={vi.fn()} />);
		expect(screen.getByRole('alert').textContent).toContain('(HTTP 0)');
	});

	it('closes through the labelled Dismiss button with its own id', () => {
		const onDismiss = vi.fn();
		render(<ActionBannerEntry item={item({ id: 42, kind: 'error' })} onDismiss={onDismiss} />);
		fireEvent.click(screen.getByLabelText('Dismiss'));
		expect(onDismiss).toHaveBeenCalledWith(42);
	});
});

describe('ActionBanner', () => {
	it('renders nothing while there is nothing to say', () => {
		const { container } = render(<ActionBanner items={[]} onDismiss={vi.fn()} />);
		expect(container.innerHTML).toBe('');
	});

	it('renders every item inside the banner container', () => {
		render(<ActionBanner items={[item({ id: 1, message: 'a', kind: 'error' }), item({ id: 2, message: 'b', kind: 'error' })]} onDismiss={vi.fn()} />);
		const banner = screen.getByTestId('action-banner');
		expect(banner.querySelectorAll('[data-action-feedback]')).toHaveLength(2);
	});
});
