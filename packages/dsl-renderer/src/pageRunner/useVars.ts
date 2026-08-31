import { useCallback, useReducer } from 'react';

export function useVars(initialVars?: Record<string, unknown>): {
	vars: Record<string, unknown>;
	setVar: (key: string, value: unknown) => void;
} {
	const [vars, dispatch] = useReducer(
		(state: Record<string, unknown>, action: { key: string; value: unknown }) => ({
			...state,
			[action.key]: action.value,
		}),
		initialVars ?? {}
	);
	const setVar = useCallback((key: string, value: unknown) => {
		dispatch({ key, value });
	}, []);
	return { vars, setVar };
}
