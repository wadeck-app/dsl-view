import { render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { resetReportedMessages } from '@dsl-ui/components/dev/reportOnce.js';
import { FigureRow } from './FigureRow.js';
import { SparklineView, type SparklineViewProps } from './SparklineView.js';

// The shape of registry.robustness.test.tsx, at component level: that sweep renders every registry component through the
// generated entries (real DslRenderer, schemas, coerceProp), which needs dsl-view's own build. This one feeds the same
// odd values (plus the ones a hand-written React caller can add: NaN, functions, BigInt, Symbol, a circular object) to every
// declared prop AND to every nested field, one at a time, on top of a valid baseline.
const circular: Record<string, unknown> = {};
circular['self'] = circular;

const ODD_VALUES: ReadonlyArray<readonly [string, unknown]> = [
	['undefined', undefined],
	['null', null],
	['empty string', ''],
	['zero', 0],
	['false', false],
	['empty object', {}],
	['empty array', []],
	['text', 'text'],
	['number', 42],
	['array of empty objects', [{}]],
	['nested wrong shape', { nested: { wrong: [1, 'a', null] } }],
	['negative', -1],
	['NaN', Number.NaN],
	['Infinity', Infinity],
	['true', true],
	['function', () => 1],
	['bigint', 10n],
	['symbol', Symbol('s')],
	['circular object', circular],
	['Date', new Date(0)],
];

// INTENDED_ERRORS of the registry sweep: components may throw on purpose for a configuration that makes them unusable.
// FigureRow and SparklineView have none; the list exists so a deliberate throw has to be written down here.
const INTENDED_ERRORS: Record<string, RegExp> = {};

class Catcher extends React.Component<{ children: React.ReactNode; onError: (error: unknown) => void }, { failed: boolean }> {
	state = { failed: false };
	static getDerivedStateFromError() {
		return { failed: true };
	}
	componentDidCatch(error: unknown) {
		this.props.onError(error);
	}
	render() {
		return this.state.failed ? null : this.props.children;
	}
}

// Independent statement of "what a valid list of figures is", written from the documented contract and NOT from the
// component's validators (a check that reuses the code under test cannot disagree with it).
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const finite = (v: unknown): boolean => typeof v === 'number' && Number.isFinite(v);
const pointOk = (p: unknown): boolean =>
	isObj(p) &&
	typeof p['label'] === 'string' &&
	typeof p['measured'] === 'boolean' &&
	(p['measured'] ? finite(p['value']) : p['value'] == null || finite(p['value'])) &&
	(p['text'] == null || typeof p['text'] === 'string') &&
	(p['detail'] == null || typeof p['detail'] === 'string');
const trendOk = (t: unknown): boolean =>
	isObj(t) &&
	['up', 'down', 'flat', 'none'].includes(t['direction'] as string) &&
	typeof t['text'] === 'string' &&
	t['text'] !== '' &&
	(t['spark'] == null || (Array.isArray(t['spark']) && t['spark'].every(v => v === null || finite(v)))) &&
	(t['points'] == null || (Array.isArray(t['points']) && t['points'].every(pointOk)));
const itemOk = (i: unknown): boolean =>
	isObj(i) &&
	typeof i['label'] === 'string' &&
	(typeof i['value'] === 'string' || finite(i['value'])) &&
	(i['unit'] == null || typeof i['unit'] === 'string') &&
	(i['href'] == null || typeof i['href'] === 'string') &&
	(i['external'] == null || typeof i['external'] === 'boolean') &&
	(i['trend'] == null || trendOk(i['trend']));
/** An absent list is a source not loaded yet. */
const itemsOk = (items: unknown): boolean => items == null || (Array.isArray(items) && items.every(itemOk));

const basePoints = [
	{ label: 'a', value: 1, measured: true },
	{ label: 'b', value: null, measured: false },
	{ label: 'c', value: 3, measured: true },
];
const baseTrend: Record<string, unknown> = { direction: 'up', text: 'Up', points: basePoints };
const baseItem: Record<string, unknown> = { label: 'Latency', value: '120', unit: 'ms', href: '/r', external: false, trend: baseTrend };

interface Case {
	label: string;
	items: unknown;
}

function figureRowCases(): Case[] {
	const cases: Case[] = [{ label: 'baseline', items: [baseItem] }];
	for (const [name, value] of ODD_VALUES) {
		cases.push({ label: `items = ${name}`, items: value });
		cases.push({ label: `items = [${name}]`, items: [value] });
		for (const key of Object.keys(baseItem)) {
			cases.push({ label: `item.${key} = ${name}`, items: [{ ...baseItem, [key]: value }] });
		}
		for (const key of ['direction', 'text', 'spark', 'points']) {
			cases.push({ label: `trend.${key} = ${name}`, items: [{ ...baseItem, trend: { ...baseTrend, [key]: value } }] });
		}
		cases.push({ label: `trend = ${name}`, items: [{ ...baseItem, trend: value }] });
		cases.push({ label: `trend.points = [${name}]`, items: [{ ...baseItem, trend: { ...baseTrend, points: [value] } }] });
		for (const key of ['label', 'value', 'measured', 'text', 'detail']) {
			cases.push({ label: `point.${key} = ${name}`, items: [{ ...baseItem, trend: { ...baseTrend, points: basePoints.map((p, i) => (i === 0 ? { ...p, [key]: value } : p)) } }] });
		}
		cases.push({ label: `trend.spark = [${name}]`, items: [{ ...baseItem, trend: { direction: 'up', text: 'Up', spark: [1, value, 3] } }] });
	}
	return cases;
}

function renderCase(node: React.ReactElement): unknown {
	let escaped: unknown;
	const view = render(
		<MemoryRouter>
			<Catcher onError={error => (escaped ??= error)}>{node}</Catcher>
		</MemoryRouter>,
	);
	view.unmount();
	return escaped;
}

function isIntended(key: string, message: string): boolean {
	return INTENDED_ERRORS[key]?.test(message) ?? false;
}

describe('FigureRow survives odd values for every prop and nested field', () => {
	const cases = figureRowCases();

	it('covers a meaningful number of cases (the sweep is not vacuous)', () => {
		expect(cases.length).toBeGreaterThan(300);
	});

	it('never throws; an alert and exactly one development warning appear exactly when the data is invalid', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const crashes: string[] = [];
		const wrongState: string[] = [];
		const noise: string[] = [];
		for (const { label, items } of cases) {
			resetReportedMessages();
			warn.mockClear();
			error.mockClear();
			let alerts = 0;
			const probe = (): React.ReactElement => <FigureRow items={items as never} />;
			const escaped = renderCaseCounting(probe(), n => (alerts = n));
			if (escaped !== undefined) {
				const message = escaped instanceof Error ? escaped.message : String(escaped);
				if (!isIntended('FigureRow', message)) {
					crashes.push(`${label}: ${message}`);
				}
				continue;
			}
			const valid = itemsOk(items);
			if (valid && (alerts !== 0 || warn.mock.calls.length !== 0)) {
				wrongState.push(`${label}: valid data gave ${alerts} alert(s), ${warn.mock.calls.length} warning(s)`);
			}
			if (!valid && (alerts !== 1 || warn.mock.calls.length !== 1)) {
				wrongState.push(`${label}: invalid data gave ${alerts} alert(s), ${warn.mock.calls.length} warning(s)`);
			}
			// The one console.error the component may cause is the shared link helper refusing an href.
			for (const call of error.mock.calls) {
				if (!String(call[0]).startsWith('[FigureRow] href ignored')) {
					noise.push(`${label}: console.error ${String(call[0]).slice(0, 120)}`);
				}
			}
		}
		expect(crashes.join('\n')).toBe('');
		expect(wrongState.join('\n')).toBe('');
		expect(noise.join('\n')).toBe('');
	});
});

/** Renders and reports how many role="alert" elements were on screen before the unmount. */
function renderCaseCounting(node: React.ReactElement, onAlerts: (count: number) => void): unknown {
	let escaped: unknown;
	const view = render(
		<MemoryRouter>
			<Catcher onError={error => (escaped ??= error)}>{node}</Catcher>
		</MemoryRouter>,
	);
	onAlerts(view.container.querySelectorAll('[role="alert"]').length);
	view.unmount();
	return escaped;
}

describe('SparklineView survives odd values for every prop and point field', () => {
	const cases: Array<{ label: string; props: Record<string, unknown> }> = [{ label: 'baseline', props: { points: basePoints, ariaLabel: 'x' } }];
	for (const [name, value] of ODD_VALUES) {
		for (const key of ['points', 'ariaLabel', 'className']) {
			cases.push({ label: `${key} = ${name}`, props: { points: basePoints, ariaLabel: 'x', [key]: value } });
		}
		cases.push({ label: `points = [${name}]`, props: { points: [value], ariaLabel: 'x' } });
		for (const key of ['label', 'value', 'measured', 'text', 'detail']) {
			cases.push({ label: `point.${key} = ${name}`, props: { points: basePoints.map((p, i) => (i === 0 ? { ...p, [key]: value } : p)), ariaLabel: 'x' } });
		}
	}

	it('never throws, and reports at most one development warning per case', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const crashes: string[] = [];
		const wrongState: string[] = [];
		for (const { label, props } of cases) {
			resetReportedMessages();
			warn.mockClear();
			error.mockClear();
			const escaped = renderCase(<SparklineView {...(props as unknown as SparklineViewProps)} />);
			if (escaped !== undefined) {
				const message = escaped instanceof Error ? escaped.message : String(escaped);
				if (!isIntended('SparklineView', message)) {
					crashes.push(`${label}: ${message}`);
				}
				continue;
			}
			const pointsValid = Array.isArray(props['points']) && (props['points'] as unknown[]).every(pointOk);
			const nameValid = typeof props['ariaLabel'] === 'string' && props['ariaLabel'] !== '';
			const expectedWarnings = !pointsValid ? 1 : nameValid ? 0 : 1;
			if (warn.mock.calls.length !== expectedWarnings) {
				wrongState.push(`${label}: expected ${expectedWarnings} warning(s), got ${warn.mock.calls.length}`);
			}
			if (error.mock.calls.length > 0) {
				wrongState.push(`${label}: console.error ${String(error.mock.calls[0]![0]).slice(0, 120)}`);
			}
		}
		expect(crashes.join('\n')).toBe('');
		expect(wrongState.join('\n')).toBe('');
	});
});

describe('INTENDED_ERRORS', () => {
	it('is empty: a deliberate throw must be listed (and then hit) before it is accepted', () => {
		expect(Object.keys(INTENDED_ERRORS)).toStrictEqual([]);
	});
});
