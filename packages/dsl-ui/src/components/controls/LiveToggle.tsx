import { Pause, Play } from 'lucide-react';
import React from 'react';

export interface LiveToggleProps {
	live: boolean;
	onChange: (v: boolean) => void;
}

/**
 * @registryCategory atomic
 * @registryTags live toggle refresh
 */
export function LiveToggle({ live, onChange }: LiveToggleProps) {
	return (
		// violations-suppress: react/no-raw-button LiveToggle IS an atomic wrapper for the live/pause toggle interaction
		<button
			type="button"
			onClick={() => onChange(!live)}
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
