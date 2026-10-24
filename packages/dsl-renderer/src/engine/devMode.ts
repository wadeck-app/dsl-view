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
