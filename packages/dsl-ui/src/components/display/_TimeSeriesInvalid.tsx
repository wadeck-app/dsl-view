import React from 'react';

import { reportAuthoringMistake } from '@dsl-ui/utils/devDiagnostics.js';

const ALERT_CLASS = 'rounded-lg border border-danger bg-danger-bg px-2.5 py-1 text-xs text-danger-text';

export interface TimeSeriesInvalidProps {
	/** `TimeSeriesChart` or `TimeBrush`. */
	component: string;
	/** What is wrong and what to change (from the props check). */
	message: string;
}

/**
 * Inline alert shown instead of a time-series component whose props are unusable, plus ONE development warning (once per
 * message: `reportAuthoringMistake` remembers it). The warning is sent from an effect, so a server render stays silent, and
 * its text is built at the call so a production bundle drops it; the alert itself stays in production, it is the UI.
 */
export function TimeSeriesInvalid({ component, message }: TimeSeriesInvalidProps): React.ReactElement {
	React.useEffect(() => {
		reportAuthoringMistake(`[${component}] ${message} Showing an inline alert instead of ${component === 'TimeBrush' ? 'the brush' : 'the chart'} until the props are fixed.`);
	}, [component, message]);
	return (
		<div role="alert" data-invalid-props="" className={ALERT_CLASS}>
			{component}: {message}
		</div>
	);
}
