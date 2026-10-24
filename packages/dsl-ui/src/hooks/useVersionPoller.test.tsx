import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../components/overlay/Toast.js';
import { useVersionPoller } from './useVersionPoller.js';

const FIVE_MINUTES = 5 * 60 * 1000;
const MESSAGE = 'A new version is available - reload to update';

function Poller({ endpoint }: { endpoint?: string }) {
	useVersionPoller(endpoint);
	return null;
}

function mount(endpoint?: string) {
	return render(
		<ToastProvider>
			<Poller endpoint={endpoint} />
		</ToastProvider>
	);
}

// Advance the fake clock inside act(), so React flushes the state updates (the toast) the timers cause.
async function tick(ms: number) {
	await act(async () => {
		await vi.advanceTimersByTimeAsync(ms);
	});
}

const originalLocation = window.location;
const reload = vi.fn();

function serverVersion(version: string) {
	const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ version }) });
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

beforeEach(() => {
	vi.useFakeTimers();
	reload.mockClear();
	Object.defineProperty(window, 'location', { configurable: true, value: { ...originalLocation, reload } });
	delete window.__APP_VERSION__;
});

afterEach(() => {
	Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
	delete window.__APP_VERSION__;
	vi.useRealTimers();
});

describe('useVersionPoller', () => {
	it('checks the default endpoint right away, and again every five minutes', async () => {
		const fetchMock = serverVersion('dev');
		mount();

		await tick(0);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledWith('/api/version');

		await tick(FIVE_MINUTES - 1);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		await tick(1);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('uses the endpoint it is given', async () => {
		const fetchMock = serverVersion('dev');
		mount('/internal/build');

		await tick(0);

		expect(fetchMock).toHaveBeenCalledWith('/internal/build');
	});

	it('stays quiet while the server reports the running version (no build stamp means "dev")', async () => {
		serverVersion('dev');
		mount();

		await tick(0);

		expect(screen.queryByText(MESSAGE)).toBeNull();
		await tick(60_000);
		expect(reload).not.toHaveBeenCalled();
	});

	it('compares with window.__APP_VERSION__ when the build stamped one', async () => {
		window.__APP_VERSION__ = '2026.10.24-175';
		serverVersion('2026.10.24-175');
		mount();

		await tick(0);

		expect(screen.queryByText(MESSAGE)).toBeNull();
	});

	it('announces a new version once and reloads the page ten seconds later; polling then stops', async () => {
		window.__APP_VERSION__ = '1';
		const fetchMock = serverVersion('2');
		mount();

		await tick(0);
		expect(screen.getByText(MESSAGE)).toBeInTheDocument();
		expect(reload).not.toHaveBeenCalled();

		await tick(9_999);
		expect(reload).not.toHaveBeenCalled();
		await tick(1);
		expect(reload).toHaveBeenCalledTimes(1);

		// The page is about to reload: no further request and no second announcement.
		await tick(FIVE_MINUTES * 2);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it('a failed response or a network error is not an update: nothing is announced and polling continues', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({ ok: false, json: async () => ({ version: 'other' }) })
			.mockRejectedValueOnce(new Error('offline'))
			.mockResolvedValue({ ok: true, json: async () => ({ version: 'dev' }) });
		vi.stubGlobal('fetch', fetchMock);
		mount();

		await tick(0);
		await tick(FIVE_MINUTES);
		await tick(FIVE_MINUTES);

		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(screen.queryByText(MESSAGE)).toBeNull();
		expect(reload).not.toHaveBeenCalled();
	});

	it('unmounting stops the polling', async () => {
		const fetchMock = serverVersion('dev');
		const { unmount } = mount();
		await tick(0);

		unmount();
		await tick(FIVE_MINUTES * 3);

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('unmounting after the announcement cancels the pending reload', async () => {
		window.__APP_VERSION__ = '1';
		serverVersion('2');
		const { unmount } = mount();
		await tick(0);

		unmount();
		await tick(20_000);

		// The user already left the page that asked for the reload: reloading whatever they are on now would be a surprise.
		expect(reload).not.toHaveBeenCalled();
	});
});
