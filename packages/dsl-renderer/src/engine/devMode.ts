// process is defined by Node.js, Webpack, Vite, and similar bundlers.
// The runtime usage below is always guarded by `typeof process !== 'undefined'`.
// This declaration prevents TS errors in browser-targeted consuming projects.
declare const process: { env: Record<string, string | undefined> } | undefined;

/** True outside production builds. Dev-only diagnostics (authoring mistakes shown or logged) are gated on it. */
export function isDevelopment(): boolean {
	return typeof process !== 'undefined' && process.env['NODE_ENV'] !== 'production';
}
