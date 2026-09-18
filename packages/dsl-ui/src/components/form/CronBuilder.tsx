import React, { useState } from 'react';

import { Button } from '../controls/_Button.js';
import { ChipButton } from '../controls/ChipButton.js';
import { buildCron, parseCronToSpec, CRON_SPEC_DEFAULTS, type CronFreq, type CronSpec } from './cron-spec.js';

export type { CronFreq, CronSpec };
export { buildCron, parseCronToSpec };

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
/** Frequencies where the firing hours matter. The rest are defined by the minute alone. */
const HOUR_BASED: CronFreq[] = ['daily', 'weekdays', 'weekly', 'monthly'];

export interface CronBuilderProps {
	/** The expression to open on. Ignored if this wizard cannot express it. */
	value: string;
	onChange: (v: string) => void;
	onClose: () => void;
}

// @formatter:off
const SEL         = 'rounded border border-border px-2 py-1 text-sm bg-surface text-content focus:outline-none';
const PREVIEW_CLS = 'text-xs font-mono text-content bg-bg border border-border rounded px-2 py-1';
const LEGEND_CLS  = 'text-xs uppercase tracking-wide text-muted';
/*
 * A raised panel, not a grey slab.
 *
 * This was `bg-muted-bg`, which is the token for hover and muted fills - using it as a panel
 * background gave the wizard a flat grey block that read as disabled rather than as a surface
 * floating over the form. `bg-surface` with a border and a shadow is what every other panel in the
 * system uses, so it now looks like one.
 */
const PANEL_CLS   = 'mt-2 p-3 rounded-lg border border-border bg-surface shadow-md space-y-3 text-sm';
// @formatter:on

/**
 * Frequency wizard that emits a cron expression. Shows a live preview of the string it would
 * produce, and only commits it on Apply.
 *
 * The selects and buttons are raw on purpose: this component IS the atomic control, and the field
 * components wrap themselves in a label and a block layout that cannot sit inline in this row.
 *
 * @registryCategory composite
 * @registryTags cron schedule form
 */
export function CronBuilder({ value, onChange, onClose }: CronBuilderProps) {
	// Opens on the expression it was given. Falling back to the defaults only when the wizard
	// genuinely cannot describe it keeps Apply from rewriting a schedule the user never edited.
	const [spec, setSpec] = useState<CronSpec>(() => parseCronToSpec(value) ?? CRON_SPEC_DEFAULTS);
	const patch = (over: Partial<CronSpec>): void => { setSpec(prev => ({ ...prev, ...over })); };
	const preview = buildCron(spec);
	const showHours = HOUR_BASED.includes(spec.freq);

	// The last hour cannot be unselected: an empty hour field is not a valid expression, and
	// silently substituting midnight would move the job without saying so.
	const toggleHour = (hour: number): void => {
		const isOn = spec.hours.includes(hour);
		if (isOn && spec.hours.length === 1) {
			return;
		}
		patch({ hours: isOn ? spec.hours.filter(h => h !== hour) : [...spec.hours, hour] });
	};

	return (
		<div className={PANEL_CLS}>
			<div className="flex items-center gap-2 flex-wrap">
				<label className="text-muted shrink-0" htmlFor="cron-freq">Frequency:</label>
				<select id="cron-freq" className={SEL} value={spec.freq} onChange={e => patch({ freq: e.target.value as CronFreq })}>
					<option value="minutely">Every minute</option>
					<option value="every-n-min">Every N minutes</option>
					<option value="hourly">Every hour</option>
					<option value="daily">Daily</option>
					<option value="weekdays">Weekdays (Mon-Fri)</option>
					<option value="weekly">Specific days</option>
					<option value="monthly">Monthly</option>
				</select>
				{spec.freq === 'every-n-min' && (
					// violations-suppress: react/no-raw-input FieldNumber renders its own label and block layout so it cannot sit inline in this row; this wizard IS the atomic control
					<input
						type="number"
						min={1}
						max={59}
						value={spec.everyNMinutes}
						aria-label="Every N minutes"
						onChange={e => patch({ everyNMinutes: Number(e.target.value) })}
						className={`${SEL} w-16`}
					/>
				)}
				{spec.freq === 'monthly' && (
					<>
						<label className="text-muted" htmlFor="cron-dom">on day</label>
						<select id="cron-dom" className={SEL} value={spec.dayOfMonth} onChange={e => patch({ dayOfMonth: Number(e.target.value) })}>
							{Array.from({ length: 28 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
						</select>
					</>
				)}
				{(showHours || spec.freq === 'hourly') && (
					<>
						<label className="text-muted" htmlFor="cron-minute">at minute</label>
						<select id="cron-minute" className={SEL} value={spec.minute} onChange={e => patch({ minute: Number(e.target.value) })}>
							{MINUTES.map(v => <option key={v} value={v}>{String(v).padStart(2, '0')}</option>)}
						</select>
					</>
				)}
			</div>

			{/* A grid of toggles rather than one select, because a job can fire more than once a
			    day and `10 10,19 * * *` is what the real ones look like. A single-hour select could
			    not represent that, so applying the wizard deleted the second firing. */}
			{showHours && (
				<fieldset className="space-y-1">
					<legend className={LEGEND_CLS}>Hours ({spec.hours.length} selected)</legend>
					<div className="grid grid-cols-12 gap-1">
						{HOURS.map(hour => (
							<ChipButton
								key={hour}
								active={spec.hours.includes(hour)}
								shape="square"
								emphasis="strong"
								onClick={() => toggleHour(hour)}
								aria-label={`${String(hour).padStart(2, '0')} hours`}
							>
								{String(hour).padStart(2, '0')}
							</ChipButton>
						))}
					</div>
				</fieldset>
			)}

			{spec.freq === 'weekly' && (
				<fieldset className="space-y-1">
					<legend className={LEGEND_CLS}>Days</legend>
					<div className="flex gap-1 flex-wrap">
						{DAYS.map((d, i) => (
							<ChipButton
								key={d}
								active={spec.weekdays[i]}
								shape="square"
								emphasis="strong"
								onClick={() => patch({ weekdays: spec.weekdays.map((v, j) => (j === i ? !v : v)) })}
							>
								{d}
							</ChipButton>
						))}
					</div>
				</fieldset>
			)}

			<div className="flex items-center justify-between gap-2 border-t border-border pt-2">
				<code className={PREVIEW_CLS}>{preview}</code>
				<div className="flex gap-2">
					{/* The design system's own button, rather than the raw pair this came from.
					    Those were styled with the consuming app's --color-on-primary and
					    --color-primary-hover, which are not tokens here and would have left
					    Apply unstyled. */}
					<Button type="button" variant="link" size="sm" onClick={onClose}>Cancel</Button>
					<Button type="button" variant="primary" size="sm" onClick={() => onChange(preview)}>Apply</Button>
				</div>
			</div>
		</div>
	);
}
