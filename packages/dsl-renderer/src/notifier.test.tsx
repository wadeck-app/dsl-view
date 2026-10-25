import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
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
	it('numbers notifications in order and drops none of them (the banner decides how many to show)', () => {
		const { result } = renderHook(() => useBannerNotifier());
		act(() => {
			for (const message of ['one', 'two', 'three', 'four', 'five', 'six', 'seven']) {
				result.current.notify({ kind: 'error', message });
			}
		});
		expect(result.current.items.map(i => i.message)).toEqual(['one', 'two', 'three', 'four', 'five', 'six', 'seven']);
		expect(result.current.items.map(i => i.id)).toEqual([1, 2, 3, 4, 5, 6, 7]);
	});

	it('folds an identical notification right after the previous one into a count and gives it a fresh id', () => {
		const { result } = renderHook(() => useBannerNotifier());
		act(() => {
			result.current.notify({ kind: 'error', message: 'Boom', status: 503, action: 'a' });
			result.current.notify({ kind: 'error', message: 'Boom', status: 503, action: 'a' });
			result.current.notify({ kind: 'error', message: 'Boom', status: 503, action: 'a' });
		});
		expect(result.current.items).toStrictEqual([{ kind: 'error', message: 'Boom', status: 503, action: 'a', id: 3, count: 3 }]);
	});

	it('does not fold notifications that differ by kind, message, status or action, nor ones separated by another', () => {
		const { result } = renderHook(() => useBannerNotifier());
		act(() => {
			result.current.notify({ kind: 'error', message: 'Boom', status: 503, action: 'a' });
			result.current.notify({ kind: 'success', message: 'Boom', status: 503, action: 'a' });
			result.current.notify({ kind: 'success', message: 'Other', status: 503, action: 'a' });
			result.current.notify({ kind: 'success', message: 'Other', status: 500, action: 'a' });
			result.current.notify({ kind: 'success', message: 'Other', status: 500, action: 'b' });
			result.current.notify({ kind: 'error', message: 'Boom', status: 503, action: 'a' });
		});
		expect(result.current.items).toHaveLength(6);
		expect(result.current.items.every(i => (i.count ?? 1) === 1)).toBe(true);
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

	it('renders every item inside the banner container, newest first', () => {
		render(<ActionBanner items={[item({ id: 1, message: 'a', kind: 'error' }), item({ id: 2, message: 'b', kind: 'error' })]} onDismiss={vi.fn()} />);
		const banner = screen.getByTestId('action-banner');
		// Which items, in which order (newest first), not just how many.
		expect(Array.from(banner.querySelectorAll('[data-action-feedback]')).map(el => el.textContent)).toEqual([
			expect.stringContaining('b'),
			expect.stringContaining('a'),
		]);
		expect(screen.queryByRole('button', { name: /more|fewer/i })).toBeNull();
	});

	const many = (n: number) => Array.from({ length: n }, (_, i) => item({ id: i + 1, message: `m${i + 1}`, kind: 'error' }));
	const shownMessages = () => Array.from(screen.getByTestId('action-banner').querySelectorAll('[data-action-feedback]')).map(el => el.textContent);

	it('shows exactly five entries at once and folds the older ones behind a "+N more" control', () => {
		render(<ActionBanner items={many(5)} onDismiss={vi.fn()} />);
		expect(shownMessages()).toHaveLength(5);
		expect(screen.queryByRole('button', { name: /more/i })).toBeNull();

		cleanup();
		render(<ActionBanner items={many(8)} onDismiss={vi.fn()} />);
		expect(shownMessages()).toEqual(['m8', 'm7', 'm6', 'm5', 'm4'].map(m => expect.stringContaining(m)));
		const more = screen.getByRole('button', { name: '+3 more' });
		expect(more.getAttribute('aria-expanded')).toBe('false');
	});

	it('shows every folded entry once expanded, and folds them again', () => {
		render(<ActionBanner items={many(7)} onDismiss={vi.fn()} />);
		fireEvent.click(screen.getByRole('button', { name: '+2 more' }));
		expect(shownMessages()).toHaveLength(7);
		const fewer = screen.getByRole('button', { name: 'Show fewer' });
		expect(fewer.getAttribute('aria-expanded')).toBe('true');
		fireEvent.click(fewer);
		expect(shownMessages()).toHaveLength(5);
	});

	it('dismissing a shown entry brings the next older one into view', () => {
		const { rerender } = render(<ActionBanner items={many(6)} onDismiss={vi.fn()} />);
		expect(shownMessages()).not.toContain(expect.stringContaining('m1'));
		rerender(<ActionBanner items={many(6).slice(1)} onDismiss={vi.fn()} />);
		expect(shownMessages()).toHaveLength(5);
		expect(screen.queryByRole('button', { name: /more/i })).toBeNull();
	});
});

describe('ActionBannerEntry count', () => {
	it('shows ×N for a folded entry and nothing for a single one', () => {
		const { rerender } = render(<ActionBannerEntry item={item({ kind: 'error', message: 'Boom', count: 3 })} onDismiss={vi.fn()} />);
		expect(screen.getByRole('alert').textContent).toContain('Boom ×3');
		rerender(<ActionBannerEntry item={item({ kind: 'error', message: 'Boom', count: 1 })} onDismiss={vi.fn()} />);
		expect(screen.getByRole('alert').textContent).not.toMatch(/×\d/);
		rerender(<ActionBannerEntry item={item({ kind: 'error', message: 'Boom' })} onDismiss={vi.fn()} />);
		expect(screen.getByRole('alert').textContent).not.toMatch(/×\d/);
	});

	it('restarts the auto-dismiss of a success when the same message arrives again (new id)', () => {
		vi.useFakeTimers();
		const onDismiss = vi.fn();
		const { rerender } = render(<ActionBannerEntry item={item({ id: 1 })} onDismiss={onDismiss} />);
		vi.advanceTimersByTime(4000);
		rerender(<ActionBannerEntry item={item({ id: 2, count: 2 })} onDismiss={onDismiss} />);
		vi.advanceTimersByTime(4000);
		expect(onDismiss).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1000);
		expect(onDismiss).toHaveBeenCalledWith(2);
	});
});
