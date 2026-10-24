import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The accent needs light-dark() and color-mix(): AccentScope and useRootAccent must both warn (in development, once)
// when the browser lacks them, and only when they actually apply a color.
describe('accent support warning', () => {
	beforeEach(() => {
		// accent.ts remembers it already warned: load a fresh copy for each test.
		vi.resetModules();
		vi.stubEnv('NODE_ENV', 'development');
		vi.stubGlobal('CSS', { supports: () => false });
	});
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		document.documentElement.removeAttribute('style');
	});

	it('AccentScope warns when it applies a color the browser cannot evaluate', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { AccentScope } = await import('./AccentScope.js');
		render(
			<AccentScope color="#0284c7">
				<p>x</p>
			</AccentScope>,
		);
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]![0]).toMatch(/^\[accent\]/);
	});

	it('AccentScope stays silent without a color: nothing is applied, nothing can be unsupported', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { AccentScope } = await import('./AccentScope.js');
		render(
			<AccentScope color={undefined}>
				<p>x</p>
			</AccentScope>,
		);
		expect(warn).not.toHaveBeenCalled();
	});

	it('useRootAccent warns when it applies a color the browser cannot evaluate', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { useRootAccent } = await import('./useRootAccent.js');
		function Probe({ color }: { color: string | undefined }) {
			useRootAccent(color);
			return null;
		}
		render(<Probe color="#0284c7" />);
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]![0]).toMatch(/^\[accent\]/);
	});

	it('useRootAccent stays silent without a color', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { useRootAccent } = await import('./useRootAccent.js');
		function Probe({ color }: { color: string | undefined }) {
			useRootAccent(color);
			return null;
		}
		render(<Probe color={undefined} />);
		expect(warn).not.toHaveBeenCalled();
	});
});
