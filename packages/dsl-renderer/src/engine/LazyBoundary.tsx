import React from 'react';

interface LazyErrorBoundaryState {
	error: Error | null;
}

// Scoped per lazily-loaded component (used by @registryLazy-generated entries) so a
// failed or slow chunk load only affects its own slot in the tree, not the whole page.
class LazyErrorBoundary extends React.Component<{ children: React.ReactNode }, LazyErrorBoundaryState> {
	state: LazyErrorBoundaryState = { error: null };

	static getDerivedStateFromError(error: Error): LazyErrorBoundaryState {
		return { error };
	}

	componentDidCatch(error: Error, info: React.ErrorInfo): void {
		console.error('[LazyBoundary] Lazy component chunk failed to load:', error, info.componentStack);
	}

	render(): React.ReactNode {
		if (this.state.error) {
			return (
				<div role="alert">
					<strong>Failed to load component:</strong> {this.state.error.message}
				</div>
			);
		}
		return this.props.children;
	}
}

// Renders only while the wrapped component's chunk is loading - warns once per mount so a
// blank slot during the fetch is never silent. No prop exists (yet) to opt into a visible
// fallback per @registryLazy component instead - see dsl-renderer-consumer-reference.md.
function LazyBoundaryFallback(): null {
	React.useEffect(() => {
		console.warn(
			'[LazyBoundary] A @registryLazy component is fetching its chunk - rendering nothing visible in its slot until it resolves.'
		);
	}, []);
	return null;
}

/** Suspense + error boundary pair wrapping one lazily-loaded component's own output. */
export function LazyBoundary({ children }: { children: React.ReactNode }): React.ReactElement {
	return (
		<LazyErrorBoundary>
			<React.Suspense fallback={<LazyBoundaryFallback />}>{children}</React.Suspense>
		</LazyErrorBoundary>
	);
}
