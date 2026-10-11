import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { LazyBoundary } from './LazyBoundary.js';

describe('LazyBoundary', () => {
	it('renders the lazy component once its chunk resolves', async () => {
		const LazyComp = React.lazy(() => Promise.resolve({ default: () => <div data-testid="loaded">loaded</div> }));

		render(
			<LazyBoundary>
				<LazyComp />
			</LazyBoundary>
		);

		await waitFor(() => expect(screen.getByTestId('loaded')).toBeInTheDocument());
	});

	it('warns while the chunk is pending, with nothing visible', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		let resolveImport!: () => void;
		const importPromise = new Promise<{ default: React.ComponentType }>(resolve => {
			resolveImport = () => resolve({ default: () => <div data-testid="loaded">loaded</div> });
		});
		const LazyComp = React.lazy(() => importPromise);

		render(
			<LazyBoundary>
				<LazyComp />
			</LazyBoundary>
		);

		await waitFor(() => expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('@registryLazy')));

		resolveImport();
		await waitFor(() => expect(screen.getByTestId('loaded')).toBeInTheDocument());
		warnSpy.mockRestore();
	});

	it('catches a rejected chunk import and shows an error instead of crashing', async () => {
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const LazyComp = React.lazy(() => Promise.reject(new Error('chunk load failed')));

		render(
			<LazyBoundary>
				<LazyComp />
			</LazyBoundary>
		);

		await waitFor(() => {
			expect(screen.getByRole('alert')).toHaveTextContent('chunk load failed');
		});
		errorSpy.mockRestore();
	});
});
