import { useCallback, useReducer } from 'react';

// Monotone counter — guarantees distinct ticks even when two publishes happen within
// the same millisecond (common in tests and fast user interactions).
let outputTick = 0;

export function useOutputs(): {
	outputs: Record<string, Record<string, unknown>>;
	publishOutput: (componentId: string, outputName: string, value: unknown) => void;
} {
	const [outputs, dispatch] = useReducer(
		(
			state: Record<string, Record<string, unknown>>,
			action: { id: string; name: string; value: unknown }
		) => ({
			...state,
			[action.id]: {
				...(state[action.id] ?? {}),
				[action.name]: action.value,
			},
		}),
		{}
	);
	const publishOutput = useCallback((componentId: string, outputName: string, value: unknown) => {
		// When value is undefined (arg discarded via [_] in YAML $outputs), store a monotone
		// tick instead so each call produces a new reference — brains watching this output
		// re-trigger on every event, not just the first one.
		const stored = value === undefined ? { $tick: ++outputTick } : value;
		dispatch({ id: componentId, name: outputName, value: stored });
	}, []);
	return { outputs, publishOutput };
}
