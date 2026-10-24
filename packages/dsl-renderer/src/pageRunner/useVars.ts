import { useCallback, useReducer, useRef } from 'react';

import { isExpressionString } from '../expression.js';

/**
 * Page variables (`$vars`). A declared value is the variable's initial value, except when it is an expression
 * (`payload: $sources.event.exampleText`): such a variable starts undefined and is SEEDED once, the first time the
 * expression resolves to something other than undefined (a source value arrives after the first render, `$vars` are read
 * at mount). Seeding never overwrites a value the page has set since (a field edit, a brain's `setVar`), so a poll that
 * re-sends the source cannot erase what the user typed.
 */
export function useVars(initialVars?: Record<string, unknown>): {
	vars: Record<string, unknown>;
	setVar: (key: string, value: unknown) => void;
	/** Seeds every declared expression variable that is not seeded or set yet. Safe to call on every render. */
	seedFrom: (resolve: (expression: string) => unknown) => void;
} {
	const [vars, dispatch] = useReducer(
		(state: Record<string, unknown>, action: { key: string; value: unknown }) => ({
			...state,
			[action.key]: action.value,
		}),
		initialVars,
		(declared): Record<string, unknown> =>
			Object.fromEntries(Object.entries(declared ?? {}).filter(([, value]) => !isSeedExpression(value)))
	);
	const settled = useRef(new Set<string>());
	const declaredRef = useRef(initialVars);
	declaredRef.current = initialVars;

	const setVar = useCallback((key: string, value: unknown) => {
		settled.current.add(key);
		dispatch({ key, value });
	}, []);

	const seedFrom = useCallback((resolve: (expression: string) => unknown) => {
		for (const [key, declared] of Object.entries(declaredRef.current ?? {})) {
			if (!isSeedExpression(declared) || settled.current.has(key)) {
				continue;
			}
			const value = resolve(declared);
			if (value !== undefined) {
				settled.current.add(key);
				dispatch({ key, value });
			}
		}
	}, []);

	return { vars, setVar, seedFrom };
}

function isSeedExpression(declared: unknown): declared is string {
	return typeof declared === 'string' && isExpressionString(declared);
}
