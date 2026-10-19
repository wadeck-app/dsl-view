// `process` is not typed in this package (tsconfig `types` lists only jest-dom) and is absent in a browser.
// Declared here so the bundler-replaced expression below type-checks.
declare const process: { env: { NODE_ENV?: string } };

/**
 * Whether the app runs in development. The only place that knows how to tell.
 *
 * Reads `process.env.NODE_ENV` without a `typeof process` guard on purpose: Vite (dev and build) and webpack
 * replace that exact expression statically, also inside dependencies, whereas a `typeof process` guard is NOT
 * replaced and evaluates to "undefined" in a browser, which would hide the tool even in development.
 *
 * Fails closed: when the bundler did not replace the expression and `process` does not exist, or NODE_ENV is anything
 * but "development" (including "test"), this is not development and a dev-only tool stays hidden unless the caller
 * forces it (see AbDock's `enabled`).
 */
export function isDev(): boolean {
	try {
		return process.env.NODE_ENV === 'development';
	} catch {
		// `process` is not defined and nothing replaced the expression: cannot tell, so not development.
		return false;
	}
}
