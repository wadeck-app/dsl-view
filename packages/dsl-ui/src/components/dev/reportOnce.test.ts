import { afterEach, describe, expect, it, vi } from 'vitest';

describe('reportOnce', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.resetModules();
	});

	// The "already said" memory lives in the module: take a fresh copy for each test.
	const load = async () => (await import('./reportOnce.js')).reportOnce;

	it('logs a message the first time with the given logger, and never again', async () => {
		const reportOnce = await load();
		const log = vi.fn();
		reportOnce('same', log);
		reportOnce('same', log);
		reportOnce('same', log);
		expect(log).toHaveBeenCalledTimes(1);
		expect(log).toHaveBeenCalledWith('same');
	});

	it('tracks messages independently, whatever the logger', async () => {
		const reportOnce = await load();
		const first = vi.fn();
		const second = vi.fn();
		reportOnce('one', first);
		reportOnce('two', second);
		reportOnce('one', second);
		expect(first).toHaveBeenCalledTimes(1);
		expect(second).toHaveBeenCalledTimes(1);
		expect(second).toHaveBeenCalledWith('two');
	});

	it('warns on the console by default', async () => {
		const reportOnce = await load();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		reportOnce('default logger');
		reportOnce('default logger');
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledWith('default logger');
	});
});
