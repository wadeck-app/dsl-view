import React from 'react';

export interface ErrorBoundaryProps {
	children: React.ReactNode;
	fallback?: React.ReactNode;
	/**
	 * When any entry differs (Object.is) from the previous render, an error already caught is cleared and the children
	 * are tried again. Without it a crashed boundary stays on its fallback until the page is reloaded, even after the
	 * input that caused the crash has changed. Pass the value the children depend on (a route, a document, a record id).
	 */
	resetKeys?: readonly unknown[];
}

function resetKeysChanged(previous: readonly unknown[] | undefined, next: readonly unknown[] | undefined): boolean {
	const before = previous ?? [];
	const after = next ?? [];
	return before.length !== after.length || before.some((key, index) => !Object.is(key, after[index]));
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, info: React.ErrorInfo): void {
		console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
	}

	componentDidUpdate(previous: ErrorBoundaryProps): void {
		// Keys that changed in the very update that crashed trigger one retry; if the children throw again the keys are
		// then unchanged, so the boundary stays on its fallback instead of looping.
		if (this.state.hasError && resetKeysChanged(previous.resetKeys, this.props.resetKeys)) {
			this.setState({ hasError: false, error: null });
		}
	}

	render(): React.ReactNode {
		if (this.state.hasError) {
			if (this.props.fallback) return this.props.fallback;
			return (
				<div role="alert" className="m-4 rounded border-2 border-danger bg-danger-bg p-4 text-danger-text">
					<strong className="mb-2 block">Something went wrong</strong>
					<pre className="mb-3 whitespace-pre-wrap break-words text-sm">{this.state.error?.message ?? 'Unknown error'}</pre>
					{/* violations-suppress: react/no-raw-button error boundary must be dependency-free - importing Button risks masking the original crash */}
					<button
						type="button"
						onClick={() => window.location.reload()}
						className="cursor-pointer rounded bg-danger px-3.5 py-1.5 text-sm text-white"
					>
						Reload
					</button>
				</div>
			);
		}
		return this.props.children;
	}
}
