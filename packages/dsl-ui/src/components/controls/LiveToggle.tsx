import { Pause, Play } from 'lucide-react';
import React from 'react';

import { useOptionalUrlParam } from '@dsl-ui/context/UrlParamContext.js';

export interface LiveToggleProps {
	/** Whether live refresh is on. Controlled mode, together with `onChange`; ignored when `urlParam` is set. */
	live?: boolean;
	/** Called with the new state. Ignored when `urlParam` is set. */
	onChange?: (v: boolean) => void;
	/**
	 * URL search param name backing the state, e.g. "live". When set, the toggle reads and writes it through
	 * UrlParamContext: `true` while it is on, `false` when it is off; an absent param, `""`, `0` and `false` all read as
	 * off. This is what a source's `pollWhen: $urlParam.live` looks at. `live` / `onChange` are ignored.
	 */
	urlParam?: string;
}

/**
 * @registryCategory atomic
 * @registryTags live toggle refresh
 */
export function LiveToggle({ live: liveProp = false, onChange, urlParam }: LiveToggleProps) {
	const [urlValue, setUrlValue] = useOptionalUrlParam(urlParam);
	const live = urlParam ? urlValue !== null && urlValue !== '' && urlValue !== '0' && urlValue !== 'false' : liveProp;
	const toggle = () => {
		if (urlParam) {
			setUrlValue(live ? 'false' : 'true');
			return;
		}
		onChange?.(!live);
	};
	return (
		// violations-suppress: react/no-raw-button LiveToggle IS an atomic wrapper for the live/pause toggle interaction
		<button
			type="button"
			onClick={toggle}
			className={[
				'flex items-center gap-1 rounded border px-2 py-1 text-xs transition-colors cursor-pointer',
				live
					? 'border-success bg-success-bg text-success-text'
					: 'border-border bg-surface text-muted hover:text-content',
			].join(' ')}
			aria-pressed={live}
			title={live ? 'Pause live refresh' : 'Start live refresh'}
		>
			{live ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
			{live ? 'live' : 'paused'}
		</button>
	);
}
