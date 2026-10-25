import { reportOnce } from '@dsl-ui/components/dev/reportOnce.js';

// `process` is not typed in this package and is replaced statically by every bundler (and defined by Node).
declare const process: { env: { NODE_ENV?: string } };

/**
 * Reports an AUTHORING mistake (an unknown icon name, a typo'd size, a malformed column spec) once, in development and
 * test builds only. The fix lives in the YAML or the props the developer wrote, so a production console and a
 * production bundle have no use for it. Problems that come from data or the environment at run time (a failed load, a
 * clipboard refusal, a list that is not a list) are NOT authoring mistakes: they keep using `reportOnce` and stay on.
 *
 * The guard is the exact expression bundlers replace, written inline: with it, a production build turns the function
 * into a no-op and drops the code after it; through a helper function call it would not be removable. Keep the message
 * argument cheap (a template string): it is built even when nothing is logged.
 */
export function reportAuthoringMistake(message: string, log: (message: string) => void = console.warn): void {
	if (process.env.NODE_ENV === 'production') {
		return;
	}
	reportOnce(message, log);
}

/** Same as {@link reportAuthoringMistake}, logged at error level (the mistake makes something not render as written). */
export function reportAuthoringError(message: string): void {
	if (process.env.NODE_ENV === 'production') {
		return;
	}
	reportOnce(message, console.error);
}
