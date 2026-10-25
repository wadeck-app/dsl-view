// `process` is absent in a browser. Bundlers (Vite in dev and in build, webpack, esbuild) replace the exact expression
// `process.env.NODE_ENV` statically, also inside dependencies, so it must be read WITHOUT a `typeof process` guard:
// a guard is not replaced and evaluates to false in a browser, which silently switched every dev diagnostic off in
// `vite dev` (measured with a real dev server). When nothing replaced the expression and `process` does not exist, the
// ReferenceError below is caught and the answer is "not development" (fail closed).
declare const process: { env: { NODE_ENV?: string } };

/** True outside production builds. Dev-only diagnostics (authoring mistakes shown or logged) are gated on it. */
export function isDevelopment(): boolean {
	try {
		return process.env.NODE_ENV !== 'production';
	} catch {
		return false;
	}
}

/**
 * Logs an AUTHORING mistake (a retired YAML key, an unknown action key, a missing `suspenseFallback`) in development and
 * test builds only: the fix lives in the page the developer wrote, so a production console and a production bundle have
 * no use for it. Problems that come from data or the environment at run time (a failed load, a refused request) keep
 * using `console` directly and stay on in production.
 *
 * The guard is the exact expression bundlers replace, written inline (see the note above): a production build turns
 * the function into a no-op and drops the code after it. Build the message cheaply, it is evaluated either way.
 */
export function devWarn(message: string): void {
	if (process.env.NODE_ENV === 'production') {
		return;
	}
	console.warn(message);
}

/** Same as {@link devWarn}, at error level. */
export function devError(message: string): void {
	if (process.env.NODE_ENV === 'production') {
		return;
	}
	console.error(message);
}
