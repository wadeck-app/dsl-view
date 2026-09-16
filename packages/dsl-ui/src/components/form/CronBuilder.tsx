import React, { useState } from 'react';

import { Button } from '../controls/_Button.js';
import { ChipButton } from '../controls/ChipButton.js';

export type CronFreq = 'minutely' | 'every-n-min' | 'hourly' | 'daily' | 'weekdays' | 'weekly' | 'monthly';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Builds a standard 5-field cron expression: minute hour day-of-month month day-of-week.
 *
 * Exported because it is the part worth testing on its own, and because a caller that
 * only needs the string should not have to render the wizard to get it.
 */
export function buildCron(
	freq: CronFreq,
	n: number,
	h: number,
	m: number,
	day: number,
	weekdays: boolean[],
): string {
	switch (freq) {
		case 'minutely':    return '* * * * *';
		case 'every-n-min': return `*/${n} * * * *`;
		case 'hourly':      return `${m} * * * *`;
		case 'daily':       return `${m} ${h} * * *`;
		case 'weekdays':    return `${m} ${h} * * 1-5`;
		case 'weekly': {
			// Cron day-of-week is 1-based from Monday here, so the index shifts by one.
			// Falling back to Monday keeps the expression valid when nothing is ticked,
			// rather than emitting an empty field that cron would reject.
			const picked = weekdays.map((on, i) => on ? i + 1 : null).filter(Boolean).join(',') || '1';
			return `${m} ${h} * * ${picked}`;
		}
		case 'monthly':     return `${m} ${h} ${day} * *`;
		default:            return '';
	}
}

export interface CronBuilderProps {
	value: string;
	onChange: (v: string) => void;
	onClose: () => void;
}

// @formatter:off
const SEL         = 'rounded border border-border px-2 py-1 text-sm bg-surface text-content focus:outline-none';
const PREVIEW_CLS = 'text-xs text-muted bg-surface border border-border rounded px-2 py-0.5';
// @formatter:on

/**
 * Frequency wizard that emits a cron expression. Shows a live preview of the string it
 * would produce, and only commits it on Apply.
 *
 * The selects and buttons are raw on purpose: this component IS the atomic control, and
 * the field components wrap themselves in a label and a block layout that cannot sit
 * inline in this row.
 *
 * @registryCategory composite
 * @registryTags cron schedule form
 */
export function CronBuilder({ onChange, onClose }: CronBuilderProps) {
	const [freq, setFreq] = useState<CronFreq>('daily');
	const [n, setN] = useState(10);
	const [h, setH] = useState(10);
	const [m, setM] = useState(0);
	const [dom, setDom] = useState(1);
	const [weekdays, setWeekdays] = useState([true, true, true, true, true, false, false]);
	const preview = buildCron(freq, n, h, m, dom, weekdays);
	return (
		<div className="mt-2 p-3 rounded border border-border bg-muted-bg space-y-2 text-sm">
			<div className="flex items-center gap-2 flex-wrap">
				<label className="text-muted shrink-0" htmlFor="cron-freq">Frequency:</label>
				<select id="cron-freq" className={SEL} value={freq} onChange={e => setFreq(e.target.value as CronFreq)}>
					<option value="minutely">Every minute</option>
					<option value="every-n-min">Every N minutes</option>
					<option value="hourly">Every hour</option>
					<option value="daily">Daily</option>
					<option value="weekdays">Weekdays (Mon-Fri)</option>
					<option value="weekly">Specific days</option>
					<option value="monthly">Monthly</option>
				</select>
				{freq === 'every-n-min' && (
					// violations-suppress: react/no-raw-input FieldNumber renders its own label and block layout so it cannot sit inline in this row; this wizard IS the atomic control
					<input
						type="number"
						min={1}
						max={59}
						value={n}
						aria-label="Every N minutes"
						onChange={e => setN(Number(e.target.value))}
						className={`${SEL} w-16`}
					/>
				)}
				{['daily', 'weekdays', 'weekly', 'monthly'].includes(freq) && (
					<>
						<label className="text-muted" htmlFor="cron-hour">at</label>
						<select id="cron-hour" className={SEL} value={h} onChange={e => setH(Number(e.target.value))}>
							{Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}</option>)}
						</select>
						<span className="text-muted">:</span>
						<select aria-label="Minute" className={SEL} value={m} onChange={e => setM(Number(e.target.value))}>
							{[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(v => <option key={v} value={v}>{String(v).padStart(2, '0')}</option>)}
						</select>
					</>
				)}
				{freq === 'monthly' && (
					<>
						<label className="text-muted" htmlFor="cron-dom">on day</label>
						<select id="cron-dom" className={SEL} value={dom} onChange={e => setDom(Number(e.target.value))}>
							{Array.from({ length: 28 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
						</select>
					</>
				)}
				{freq === 'hourly' && (
					<>
						<label className="text-muted" htmlFor="cron-minute">at minute</label>
						<select id="cron-minute" className={SEL} value={m} onChange={e => setM(Number(e.target.value))}>
							{[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(v => <option key={v} value={v}>{v}</option>)}
						</select>
					</>
				)}
			</div>
			{freq === 'weekly' && (
				<div className="flex gap-1 flex-wrap">
					{DAYS.map((d, i) => (
						<ChipButton
							key={d}
							active={weekdays[i]}
							shape="square"
							onClick={() => setWeekdays(prev => prev.map((v, j) => j === i ? !v : v))}
						>
							{d}
						</ChipButton>
					))}
				</div>
			)}
			<div className="flex items-center justify-between gap-2">
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
