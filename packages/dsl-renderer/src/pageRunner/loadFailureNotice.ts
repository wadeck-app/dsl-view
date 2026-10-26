import { devError, devWarn } from '../engine/devMode.js';
import { getErrorMessage } from '../errors.js';
import type { Notify } from '../notifier.js';
import { errorStatus, notifyLoadFailure } from './pageRunnerUtils.js';

declare const process: { env: { NODE_ENV?: string } };

/** What made the load run: the first load, a poll tick, a refetch because a URL/route param changed, or `$refresh` / `RefreshButton`. */
export type LoadFailureTrigger = 'initial' | 'poll' | 'params' | 'refresh';

/** A failed `$sources` load, as handed to the host's `shouldNotifyLoadFailure`. */
export interface LoadFailure {
	/** Key of the `$sources` entry whose request failed (the first to fail when several do in one load); `undefined` when the failure is not tied to one source. */
	source: string | undefined;
	/** HTTP status carried by the error the fetcher threw, when it is a number. */
	status: number | undefined;
	/** The error message, as shown in the notification. */
	message: string;
	/** The error the fetcher (or the token provider) threw, untouched. */
	error: unknown;
	trigger: LoadFailureTrigger;
}

/** Host decision: `true` raises the "Could not load the data" notification, `false` leaves it to the page. */
export type ShouldNotifyLoadFailure = (failure: LoadFailure) => boolean;

/** A failed source as the page reads it, under `$ctx.$sourceErrors.<source>`. */
export interface SourceError {
	message: string;
	status?: number;
}

export function toSourceError(error: unknown): SourceError {
	const status = errorStatus(error);
	return status === undefined ? { message: getErrorMessage(error) } : { message: getErrorMessage(error), status };
}

const PROP = 'shouldNotifyLoadFailure';

/** `true` unless the host explicitly answered `false`. A broken callback never hides a failure: it is reported and the failure is notified. */
function decide(shouldNotify: unknown, failure: LoadFailure): boolean {
	if (shouldNotify === undefined) {
		return true;
	}
	// Every message is built inside its own inline production guard, so a production bundle carries none of them.
	if (typeof shouldNotify !== 'function') {
		if (process.env.NODE_ENV !== 'production') {
			devWarn(
				`[GenericPageRunner] The \`${PROP}\` prop must be a function (failure) => boolean, got ${shouldNotify === null ? 'null' : typeof shouldNotify}. ` +
					'Ignoring it: every load failure is notified.'
			);
		}
		return true;
	}
	let answer: unknown;
	try {
		answer = (shouldNotify as ShouldNotifyLoadFailure)(failure);
	} catch (thrown) {
		if (process.env.NODE_ENV !== 'production') {
			devError(
				`[GenericPageRunner] The \`${PROP}\` callback threw while deciding on the failure of source "${failure.source ?? '(unknown)'}": ${getErrorMessage(thrown)}. ` +
					'Notifying the failure. Fix the callback: it must return a boolean and not throw.'
			);
		}
		return true;
	}
	if (typeof answer !== 'boolean') {
		if (process.env.NODE_ENV !== 'production') {
			devWarn(
				`[GenericPageRunner] The \`${PROP}\` callback must return a boolean, it returned ${answer === null ? 'null' : typeof answer}. ` +
					'Notifying the failure. Return true to notify or false to leave it to the page.'
			);
		}
		return true;
	}
	return answer;
}

/**
 * Raises the load-failure notification unless the host's callback says otherwise. A suppressed failure is never invisible:
 * the page reads it in `$ctx.$sourceErrors` and, in development, the console names it once per source.
 */
export function reportLoadFailure(args: {
	notify: Notify;
	error: unknown;
	source: string | undefined;
	trigger: LoadFailureTrigger;
	shouldNotify: unknown;
	/** Sources already named in the development message (one message per source for the life of the page). */
	namedSources: Set<string>;
}): void {
	const { notify, error, source, trigger, shouldNotify, namedSources } = args;
	const failure: LoadFailure = { source, status: errorStatus(error), message: getErrorMessage(error), error, trigger };
	if (decide(shouldNotify, failure)) {
		notifyLoadFailure(notify, error);
		return;
	}
	// The message is built after this guard: a production bundle drops it (see devChecks.productionBundle.test.ts).
	if (process.env.NODE_ENV === 'production') {
		return;
	}
	const name = source ?? '(unknown)';
	if (namedSources.has(name)) {
		return;
	}
	namedSources.add(name);
	const read = source === undefined ? '$ctx.$sourceErrors' : `$ctx.$sourceErrors.${source}`;
	devWarn(
		`[GenericPageRunner] Load failure of source "${name}" was not announced: ${PROP} returned false ` +
			`(${failure.message}${failure.status === undefined ? '' : `, HTTP ${failure.status}`}). ` +
			`The page can read it as ${read}; later failures of this source are not repeated here.`
	);
}
