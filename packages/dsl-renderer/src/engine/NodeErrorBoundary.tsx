import React from 'react';

interface Props {
	/** The `$type` of the node, named in the box. */
	type: string;
	/** The authored node: a new one (a replaced view, a fixed prop) clears a previous failure. */
	node: Record<string, unknown>;
	children: React.ReactNode;
}

interface State {
	error: Error | null;
	node: Record<string, unknown>;
}

/**
 * Around the output of every node: a component that throws while rendering (SearchBar without `urlParam` or `value` and
 * `onChange`) shows a box naming it and the error, and every other node of the page keeps rendering. Without it one bad node
 * blanks the whole page. The box is shown in production as well: the authoring warnings are compiled out there, and a blank
 * page would be the only symptom.
 */
export class NodeErrorBoundary extends React.Component<Props, State> {
	state: State = { error: null, node: this.props.node };

	static getDerivedStateFromError(error: Error): Partial<State> {
		return { error };
	}

	static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
		return props.node !== state.node ? { error: null, node: props.node } : null;
	}

	componentDidCatch(error: Error, info: React.ErrorInfo): void {
		console.error(`[${this.props.type}] failed to render: ${error.message}`, error, info.componentStack);
	}

	render(): React.ReactNode {
		if (this.state.error) {
			return (
				<div role="alert">
					<strong>[{this.props.type}] failed to render:</strong> {this.state.error.message}
				</div>
			);
		}
		return this.props.children;
	}
}
