import React from 'react';

import { TimeBrushView } from './_TimeBrushView.js';
import { TimeSeriesInvalid } from './_TimeSeriesInvalid.js';
import { checkTimeBrushProps } from './timeSeriesProps.js';

export interface TimeBrushProps {
	/** Rows, typically the same `$sources.x.rows` as the charts. Undefined (still loading) or without a usable x renders nothing. */
	data: unknown[] | undefined;
	/** Row field holding the x value: a timestamp in milliseconds. @default 't' */
	xKey?: string;
	/** Row field drawn as the overview. */
	valueKey: string;
	/** `line`: the values joined by a line. `bars`: one tick per row that has a value, rising from the bottom (sparse data). @default 'line' */
	kind?: 'line' | 'bars';
	/** Shared x domain `[min, max]` in ms with min < max; without it, the extent of the data. Give the charts of the group the same one. */
	domain?: number[];
	/** The charts and brushes with the same group share one time window. @default 'default' */
	syncGroup?: string;
	/** Height of the overview strip in px. @default 56 */
	height?: number;
	/** Left offset of the strip in px: give it the `yAxisWidth` of the charts so the strip lines up with their plot areas. @default 56 */
	yAxisWidth?: number;
	/** Right offset of the strip in px: give it the `marginRight` of the charts. @default 16 */
	marginRight?: number;
}

/**
 * Overview strip with zoom buttons for the `TimeSeriesChart`s of a `syncGroup`: shows the whole period with the window the
 * charts show; drag the window to pan, drag an edge to resize, click outside it to centre on that spot. The buttons zoom in
 * and out, move earlier and later, and reset to the whole period.
 *
 * Props the component cannot use (no `valueKey`, a bad `domain`...) render an inline alert naming the fix and one development
 * warning.
 *
 * @registryCategory composite
 * @registryTags chart timeseries brush
 * @registryLazy
 */
export function TimeBrush(props: TimeBrushProps): React.ReactElement {
	const checked = checkTimeBrushProps(props);
	if (!checked.ok) {
		return <TimeSeriesInvalid component="TimeBrush" message={checked.message} />;
	}
	return <TimeBrushView {...checked.settings} />;
}
