import { useEffect } from 'react';

import { reportAuthoringMistake } from '@dsl-ui/utils/devDiagnostics.js';

// `process` is not typed in this package and is replaced statically by every bundler (and defined by Node).
declare const process: { env: { NODE_ENV?: string } };

/**
 * Solid fills (Badge, danger/success Button, Avatar, selected options) read their text colour from `--color-on-solid`,
 * with a white fallback in the Tailwind preset. An app whose own palette copy lacks the token gets that fallback
 * silently, so say once per page that it is missing. Dev and test builds only: the check is gated here, before the
 * message is built, so neither the read nor the string reaches a production bundle.
 */
export function warnMissingOnSolidToken(): void {
	if (process.env.NODE_ENV === 'production') {
		return;
	}
	if (typeof document === 'undefined') {
		return;
	}
	if (getComputedStyle(document.documentElement).getPropertyValue('--color-on-solid').trim() !== '') {
		return;
	}
	reportAuthoringMistake(
		'[dsl-ui] CSS token --color-on-solid is not defined: add `--color-on-solid` from @wadeck-app/dsl-ui theme.css to your theme. Solid Badge/Button text falls back to white meanwhile.'
	);
}

/** Call from a component that paints `text-on-solid`; `active` lets a component warn only for the variants that use it. */
export function useWarnMissingOnSolidToken(active = true): void {
	useEffect(() => {
		if (active) warnMissingOnSolidToken();
	}, [active]);
}
