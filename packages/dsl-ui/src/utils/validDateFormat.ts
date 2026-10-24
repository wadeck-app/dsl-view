import { format } from 'date-fns';

import { reportOnce } from '@dsl-ui/components/dev/reportOnce.js';
import { getErrorMessage } from '@dsl-ui/utils/errors.js';

// A fixed date: only whether date-fns accepts the format matters, never what it prints.
const PROBE_DATE = new Date(2000, 0, 1);

/**
 * The date-fns format string to use. A DSL author often writes a moment-style format (`YYYY-MM-DD`, `DD/MM/YYYY`) or an
 * empty one; date-fns throws on those, and since the picker formats its value on every render that would take the whole
 * page down. An unusable format is reported once with date-fns' own explanation and replaced by `fallback`.
 *
 * @param candidate what the node declared (`undefined` means "the default": no report)
 * @param where `Component.prop`, used in the report
 */
export function validDateFormat(candidate: string | undefined, fallback: string, where: string): string {
	if (candidate === undefined) {
		return fallback;
	}
	try {
		// An empty format prints nothing, which would make the picker look empty even with a value.
		if (candidate === '') {
			throw new Error('the format is empty');
		}
		format(PROBE_DATE, candidate);
		return candidate;
	} catch (error) {
		const reason = getErrorMessage(error).split('\n')[0];
		reportOnce(`[${where}] cannot format dates with ${JSON.stringify(candidate)} (${reason}); using ${JSON.stringify(fallback)} instead.`, console.error);
		return fallback;
	}
}
