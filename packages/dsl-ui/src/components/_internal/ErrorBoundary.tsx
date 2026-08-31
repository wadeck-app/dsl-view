import React from 'react';

export interface ErrorBoundaryProps {
	children: React.ReactNode;
	fallback?: React.ReactNode;
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

	render(): React.ReactNode {
		if (this.state.hasError) {
			if (this.props.fallback) return this.props.fallback;
			return (
				<div role="alert" className="m-4 rounded border-2 border-danger bg-danger-bg p-4 text-danger-text">
					<strong className="mb-2 block">Something went wrong</strong>
					<pre className="mb-3 whitespace-pre-wrap break-words text-sm">{this.state.error?.message ?? 'Unknown error'}</pre>
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
