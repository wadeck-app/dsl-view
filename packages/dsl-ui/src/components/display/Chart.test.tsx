import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// jsdom has no layout, so ResponsiveContainer renders nothing. Replace recharts by probes that expose the props
// Chart passes, which is what these tests are about.
vi.mock('recharts', () => {
	const probe = (name: string) => (props: Record<string, unknown>) => (
		<div data-testid={name} data-props={JSON.stringify(props, (k, v) => (k === 'children' ? undefined : typeof v === 'function' ? '[fn]' : v))}>
			{props['children'] as React.ReactNode}
		</div>
	);
	return {
		Area: probe('Area'),
		Bar: probe('Bar'),
		CartesianGrid: probe('CartesianGrid'),
		ComposedChart: probe('ComposedChart'),
		Legend: probe('Legend'),
		Line: probe('Line'),
		ResponsiveContainer: probe('ResponsiveContainer'),
		Tooltip: probe('Tooltip'),
		XAxis: probe('XAxis'),
		YAxis: probe('YAxis'),
	};
});

import { Chart } from './Chart.js';

const base = {
	data: [{ label: 'a', events: 1753 }],
	xAxisKey: 'label',
	xAxisType: 'category' as const,
	series: [{ key: 'events', name: 'Events', type: 'bar' as const, yAxisId: 'left' as const }],
};
const parseProps = (el: HTMLElement): Record<string, unknown> => {
	const parsed: Record<string, unknown> = JSON.parse(el.getAttribute('data-props')!);
	return parsed;
};
const propsOf = (id: string) => parseProps(screen.getAllByTestId(id)[0]!);

afterEach(() => vi.restoreAllMocks());

describe('Chart', () => {
	it('renders grid, both axes and legend by default', () => {
		render(<Chart {...base} />);
		expect(screen.getByTestId('CartesianGrid')).toBeInTheDocument();
		expect(screen.getByTestId('Legend')).toBeInTheDocument();
		expect(propsOf('XAxis')['hide']).toBe(false);
	});

	it('sparkline hides axes and drops grid and legend but keeps the tooltip', () => {
		render(<Chart {...base} variant="sparkline" />);
		expect(screen.queryByTestId('CartesianGrid')).toBeNull();
		expect(screen.queryByTestId('Legend')).toBeNull();
		expect(screen.getByTestId('Tooltip')).toBeInTheDocument();
		expect(propsOf('XAxis')['hide']).toBe(true);
		expect(propsOf('YAxis')['hide']).toBe(true);
	});

	it('showLegend false removes the legend on a default chart; showLegend true restores it on a sparkline', () => {
		const { unmount } = render(<Chart {...base} showLegend={false} />);
		expect(screen.queryByTestId('Legend')).toBeNull();
		unmount();
		render(<Chart {...base} variant="sparkline" showLegend />);
		expect(screen.getByTestId('Legend')).toBeInTheDocument();
	});

	it('defaults a series without colour to the theme accent, never black', () => {
		render(<Chart {...base} />);
		const bar = propsOf('Bar');
		expect(bar['fill']).toBe('var(--color-primary-solid)');
		expect(bar['stroke']).toBe('var(--color-primary-solid)');
	});

	it('keeps an explicit colour and cycles defaults across series', () => {
		render(
			<Chart
				{...base}
				series={[
					{ key: 'a', name: 'A', type: 'line', yAxisId: 'left', color: '#123456' },
					{ key: 'b', name: 'B', type: 'line', yAxisId: 'left' },
				]}
			/>,
		);
		const lines = screen.getAllByTestId('Line').map(parseProps);
		expect(lines[0]!['stroke']).toBe('#123456');
		expect(lines[1]!['stroke']).toBe('var(--color-success)');
	});

	it('warns loudly when xFormat is set on a category axis', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		render(<Chart {...base} xFormat="time" />);
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('xFormat "time" has no effect'));
	});

	it('does not warn for xFormat on a time axis', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		render(<Chart {...base} xAxisType="time" xFormat="time" />);
		expect(warn).not.toHaveBeenCalled();
	});

	it('shows the loading skeleton and the empty state', () => {
		const { unmount } = render(<Chart {...base} data={undefined} />);
		expect(screen.getByLabelText('Loading chart')).toBeInTheDocument();
		unmount();
		render(<Chart {...base} data={[]} />);
		expect(screen.getByText('No data')).toBeInTheDocument();
	});
});
