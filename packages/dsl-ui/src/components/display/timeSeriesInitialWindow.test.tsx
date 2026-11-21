// initialWindow: the visible window a chart / brush group STARTS with (and takes again when the value changes), inside the full
// data extent. Ported from the health module's fork (scrapers-owner), which used it on two pages.
import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';

import { resetReportedMessages } from '../dev/reportOnce.js';

import { TimeBrush } from './TimeBrush.js';
import { TimeSeriesChart } from './TimeSeriesChart.js';
import { DAY_MS, MIN_SPAN_MS } from './timeSeriesMath.js';
import type { TimeWindow } from './timeSeriesMath.js';
import { initialWindowProblem, parseInitialWindow } from './timeSeriesProps.js';
import { createSyncStore, TimeSeriesSyncProvider, useSyncWindow } from './timeSeriesSync.js';
import type { SyncedWindow, SyncStore } from './timeSeriesSync.js';

const D = DAY_MS;
const EXTENT: TimeWindow = [0, 100 * D];
const rows = Array.from({ length: 100 }, (_, i) => ({ t: i * D, v: i }));

// jsdom has no layout and no pointer capture.
const proto = HTMLElement.prototype as { setPointerCapture?: unknown };
let store: SyncStore;
let warn: MockInstance<(...args: unknown[]) => void>;
let utils: ReturnType<typeof render> | null;

beforeEach(() => {
	resetReportedMessages();
	vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => ({ width: 600, height: 100, left: 0, top: 0, right: 600, bottom: 100, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect);
	proto.setPointerCapture = () => undefined;
	warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
	store = createSyncStore();
	utils = null;
});
afterEach(() => {
	delete proto.setPointerCapture;
	vi.restoreAllMocks();
});

const brush = (extra: Record<string, unknown> = {}): React.ReactElement =>
	React.createElement(TimeBrush as never, { data: rows, xKey: 't', valueKey: 'v', kind: 'line', domain: EXTENT, syncGroup: 'g', height: 40, yAxisWidth: 0, marginRight: 0, ...extra } as never);
const chart = (extra: Record<string, unknown> = {}): React.ReactElement =>
	React.createElement(TimeSeriesChart as never, { data: rows, xKey: 't', domain: EXTENT, syncGroup: 'g', series: [{ key: 'v', name: 'V', color: 'red' }], height: 100, ...extra } as never);

let seen: SyncedWindow;
const Probe = ({ extent = EXTENT, initialWindow }: { extent?: TimeWindow; initialWindow?: unknown }): null => {
	seen = useSyncWindow('g', extent, initialWindow as never);
	return null;
};

// First call mounts, the next ones re-render the same tree, as a page reloading its data would.
const show = async (...children: React.ReactElement[]): Promise<void> => {
	const tree = <TimeSeriesSyncProvider store={store}>{children.map((child, i) => React.cloneElement(child, { key: i }))}</TimeSeriesSyncProvider>;
	await act(async () => {
		if (utils) {
			utils.rerender(tree);
		} else {
			utils = render(tree);
		}
	});
};
const win = (): TimeWindow | null => store.getSnapshot('g').window;
const ours = (name: string): string[] => warn.mock.calls.map(c => String(c[0])).filter(m => m.startsWith(`[${name}] `) && m.includes('initialWindow must be'));
const alerts = (): number => (utils?.container ?? document.body).querySelectorAll('[role="alert"]').length;

describe('initialWindow: application', () => {
	it('is the visible window on mount, inside the whole extent', async () => {
		await show(<Probe initialWindow={[70 * D, 100 * D]} />);
		expect(seen.window).toEqual([70 * D, 100 * D]);
		expect(seen.extent).toEqual(EXTENT);
	});

	it('the very first render already draws it (no flash of the whole extent)', async () => {
		const seenWindows: (TimeWindow | null)[] = [];
		const Spy = (): null => {
			seenWindows.push(useSyncWindow('g', EXTENT, [70 * D, 100 * D]).window);
			return null;
		};
		await show(<Spy />);
		expect(seenWindows[0]).toEqual([70 * D, 100 * D]);
	});

	it('absent or null = the whole extent (as before)', async () => {
		await show(<Probe />);
		expect(seen.window).toEqual(EXTENT);
		await show(<Probe initialWindow={null} />);
		expect(seen.window).toEqual(EXTENT);
	});

	it('is clamped to the extent, keeping its span', async () => {
		await show(<Probe initialWindow={[-10 * D, 20 * D]} />);
		expect(seen.window).toEqual([0, 30 * D]);
		await show(<Probe initialWindow={[90 * D, 130 * D]} />);
		expect(seen.window).toEqual([60 * D, 100 * D]);
	});

	it('is widened to the minimum span', async () => {
		await show(<Probe initialWindow={[10 * D, 11 * D]} />);
		expect(seen.window![1] - seen.window![0]).toBe(MIN_SPAN_MS);
	});

	it('a window covering the whole extent is the whole extent', async () => {
		await show(<Probe initialWindow={[-5 * D, 200 * D]} />);
		expect(seen.window).toEqual(EXTENT);
		expect(win()).toBeNull();
	});

	it('waits for the extent: data arriving after the first render gets the window', async () => {
		const props = { xKey: 't', syncGroup: 'g', series: [{ key: 'v', name: 'V', color: 'red' }], height: 100, initialWindow: [70 * D, 100 * D] };
		await show(React.createElement(TimeSeriesChart as never, { ...props, data: undefined } as never));
		await show(React.createElement(TimeSeriesChart as never, { ...props, data: rows, domain: EXTENT } as never));
		expect(win()).toEqual([70 * D, 100 * D]);
	});
});

describe('initialWindow: value change and user actions', () => {
	it('a changed value (compared by the two numbers) moves the window', async () => {
		await show(<Probe initialWindow={[70 * D, 100 * D]} />);
		await show(<Probe initialWindow={[40 * D, 100 * D]} />);
		expect(seen.window).toEqual([40 * D, 100 * D]);
	});

	it('a new array with the same numbers is the same value: the user pan is kept', async () => {
		await show(<Probe initialWindow={[70 * D, 100 * D]} />);
		await act(async () => seen.setWindow([10 * D, 40 * D]));
		await show(<Probe initialWindow={[70 * D, 100 * D]} />);
		expect(seen.window).toEqual([10 * D, 40 * D]);
	});

	it('user actions in between are untouched, then a new value wins again', async () => {
		await show(<Probe initialWindow={[70 * D, 100 * D]} />);
		await act(async () => seen.setWindow([10 * D, 40 * D]));
		await act(async () => seen.setWindow([0, 100 * D]));
		expect(seen.window).toEqual(EXTENT);
		await show(<Probe initialWindow={[40 * D, 100 * D]} />);
		expect(seen.window).toEqual([40 * D, 100 * D]);
	});

	it('null after a value (the period becomes "all") shows the whole extent', async () => {
		await show(<Probe initialWindow={[70 * D, 100 * D]} />);
		await show(<Probe initialWindow={null} />);
		expect(seen.window).toEqual(EXTENT);
	});

	it('a change of extent resets the window, unless an initialWindow is given (then it wins)', async () => {
		await show(<Probe extent={[0, 100 * D]} />);
		await act(async () => seen.setWindow([10 * D, 40 * D]));
		await show(<Probe extent={[0, 120 * D]} />);
		expect(seen.window).toEqual([0, 120 * D]);

		await show(<Probe extent={[0, 120 * D]} initialWindow={[90 * D, 120 * D]} />);
		await act(async () => seen.setWindow([10 * D, 40 * D]));
		await show(<Probe extent={[0, 130 * D]} initialWindow={[90 * D, 120 * D]} />);
		expect(seen.window).toEqual([90 * D, 120 * D]);
	});
});

describe('initialWindow: one sync group', () => {
	it('brush, chart and probe passing the same value apply it once', async () => {
		const iw: TimeWindow = [70 * D, 100 * D];
		await show(brush({ initialWindow: iw }), chart({ initialWindow: [...iw] }), <Probe initialWindow={[...iw]} />);
		expect(win()).toEqual(iw);
		await act(async () => store.setWindow('g', [10 * D, 40 * D]));
		await show(brush({ initialWindow: [...iw] }), chart({ initialWindow: [...iw] }), <Probe initialWindow={[...iw]} />);
		expect(win()).toEqual([10 * D, 40 * D]);
	});

	it('a component of the group mounting later with the same value does not reset the pan', async () => {
		const iw: TimeWindow = [70 * D, 100 * D];
		await show(brush({ initialWindow: iw }));
		await act(async () => store.setWindow('g', [10 * D, 40 * D]));
		await show(brush({ initialWindow: iw }), chart({ initialWindow: iw }));
		expect(win()).toEqual([10 * D, 40 * D]);
		// ... and one leaving and coming back while another stays
		await show(brush({ initialWindow: iw }));
		await show(brush({ initialWindow: iw }), chart({ initialWindow: iw }));
		expect(win()).toEqual([10 * D, 40 * D]);
	});

	it('a new value passed by all of them applies once, a later pan is kept', async () => {
		const iw: TimeWindow = [40 * D, 100 * D];
		await show(brush({ initialWindow: [70 * D, 100 * D] }), chart({ initialWindow: [70 * D, 100 * D] }));
		await show(brush({ initialWindow: iw }), chart({ initialWindow: iw }));
		expect(win()).toEqual(iw);
		await act(async () => store.setWindow('g', [10 * D, 40 * D]));
		await show(brush({ initialWindow: iw }), chart({ initialWindow: iw }));
		expect(win()).toEqual([10 * D, 40 * D]);
	});

	it('a group of another name is not touched', async () => {
		await show(<Probe initialWindow={[70 * D, 100 * D]} />, chart({ syncGroup: 'other' }));
		expect(store.getSnapshot('other').window).toBeNull();
	});
});

describe('initialWindow: reset goes to the whole extent', () => {
	it('the Reset button of the brush', async () => {
		await show(brush({ initialWindow: [70 * D, 100 * D] }), chart({ initialWindow: [70 * D, 100 * D] }));
		const reset = (): HTMLButtonElement => utils!.container.querySelector('button[aria-label="Reset zoom"]') as HTMLButtonElement;
		expect(reset().disabled).toBe(false);
		await act(async () => void fireEvent.click(reset()));
		expect(win()).toBeNull();
		expect(reset().disabled).toBe(true);
	});

	it('the key 0 and the double click of the chart', async () => {
		await show(chart({ initialWindow: [70 * D, 100 * D] }));
		const plot = utils!.container.querySelector('[data-chart-plot]')!;
		expect(win()).toEqual([70 * D, 100 * D]);
		await act(async () => void fireEvent.keyDown(plot, { key: '0' }));
		expect(win()).toBeNull();
		await act(async () => store.setWindow('g', [10 * D, 40 * D]));
		await act(async () => void fireEvent.doubleClick(utils!.container.querySelector('[data-chart-overlay]')!));
		expect(win()).toBeNull();
	});

	it('the brush shows the whole history with the window highlighted', async () => {
		await show(brush({ initialWindow: [70 * D, 100 * D] }));
		expect(utils!.container.querySelector('[data-window-label]')!.textContent).toMatch(/\(30 days\)/);
		expect(utils!.container.querySelector('[data-brush-window]')).not.toBeNull();
	});
});

describe('initialWindow: invalid values are warned once and ignored', () => {
	const bad: [string, unknown][] = [
		['text', 'x'],
		['a number', 5],
		['an object', {}],
		['one element', [1]],
		['three elements', [1, 2, 3]],
		['NaN', [NaN, 5]],
		['Infinity', [0, Infinity]],
		['texts', ['1', '2']],
		['equal bounds', [5, 5]],
		['reversed bounds', [9, 1]],
		['true', true],
	];
	for (const [label, value] of bad) {
		it(`${label}: one warn, no alert, no throw, whole extent`, async () => {
			for (const [name, make] of [['TimeSeriesChart', chart], ['TimeBrush', brush]] as const) {
				warn.mockClear();
				resetReportedMessages();
				if (utils) {
					utils.unmount();
					utils = null;
				}
				await show(make({ initialWindow: value }));
				await show(make({ initialWindow: Array.isArray(value) ? [...value] : value }));
				expect(alerts(), `${name}: no alert`).toBe(0);
				expect(ours(name), `${name}: exactly one warn`).toHaveLength(1);
				expect(ours(name)[0]).toMatch(/initialWindow must be \[from, to\]/);
				expect(win(), `${name}: whole extent`).toBeNull();
			}
		});
	}

	it('an invalid value after a valid one: warned, and the window of the previous value is released to the whole extent', async () => {
		await show(chart({ initialWindow: [70 * D, 100 * D] }));
		await show(chart({ initialWindow: [9, 1] }));
		expect(ours('TimeSeriesChart')).toHaveLength(1);
		expect(win()).toBeNull();
	});

	it('parseInitialWindow / initialWindowProblem', () => {
		expect(parseInitialWindow([1, 2])).toEqual([1, 2]);
		expect(parseInitialWindow(undefined)).toBeNull();
		expect(parseInitialWindow(null)).toBeNull();
		expect(initialWindowProblem(undefined)).toBeNull();
		expect(initialWindowProblem(null)).toBeNull();
		expect(initialWindowProblem([1, 2])).toBeNull();
		expect(initialWindowProblem([2, 1])).toMatch(/^initialWindow must be \[from, to\]/);
		expect(parseInitialWindow([2, 1])).toBeNull();
	});
});
