import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// jsdom has no layout, so ResponsiveContainer renders nothing. Replace recharts by probes that expose the props
// Chart passes, which is what these tests are about.
// The raw props (functions included) of every probe render, so the tick/tooltip formatters can be called.
const rendered = vi.hoisted(() => ({ calls: [] as Array<{ name: string; props: Record<string, any> }> }));

vi.mock('recharts', () => {
	const probe = (name: string) => (props: Record<string, unknown>) => {
		rendered.calls.push({ name, props });
		return (
			<div data-testid={name} data-props={JSON.stringify(props, (k, v) => (k === 'children' ? undefined : typeof v === 'function' ? '[fn]' : v))}>
				{props['children'] as React.ReactNode}
			</div>
		);
	};
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

beforeEach(() => {
	rendered.calls.length = 0;
});
afterEach(() => vi.restoreAllMocks());

// Raw props of the last render of a probe (optionally the n-th element with that name, in render order).
const lastProps = (name: string, nth = 0): Record<string, any> => {
	const all = rendered.calls.filter(c => c.name === name);
	// A re-render repeats the same elements: keep the last render of each by taking the tail group.
	const perRender = all.length;
	return all[perRender - 1 - nth]!.props;
};

describe('Chart formatters and wiring', () => {
	it('formats Y ticks as bytes by default, as compact numbers with yFormat number, and appends yUnit', () => {
		render(<Chart {...base} />);
		expect(lastProps('YAxis').tickFormatter(1753)).toBe('1.7 KB');
		const { unmount } = render(<Chart {...base} yFormat="number" yUnit=" ev" />);
		expect(lastProps('YAxis').tickFormatter(950)).toBe('950 ev');
		unmount();
	});

	it('formats X ticks as is on a category axis and as a date/time on a time axis', () => {
		render(<Chart {...base} />);
		expect(lastProps('XAxis').tickFormatter('10:05')).toBe('10:05');
		const ts = new Date(2026, 9, 19, 14, 5).getTime();
		const { unmount } = render(<Chart {...base} xAxisType="time" xFormat="time" />);
		expect(lastProps('XAxis').tickFormatter(ts)).toBe('14:05');
		unmount();
	});

	it('shows the full date and time in the tooltip heading when the axis only shows the time of day', () => {
		const ts = new Date(2026, 9, 19, 14, 5).getTime();
		render(<Chart {...base} xAxisType="time" xFormat="time" />);
		const heading: string = lastProps('Tooltip').labelFormatter(ts);
		// English en-GB by default, whatever language the browser has.
		expect(heading).toBe('19 Oct, 14:05');
	});

	it('keeps the configured xFormat in the tooltip heading otherwise', () => {
		const ts = new Date(2026, 9, 19, 14, 5).getTime();
		render(<Chart {...base} xAxisType="time" xFormat="date" />);
		expect(lastProps('Tooltip').labelFormatter(ts)).toBe('19 Oct');
	});

	it('keeps the default date heading when xFormat is unset, shows date+time for datetime, and the raw label on a category axis', () => {
		const ts = new Date(2026, 9, 19, 14, 5).getTime();
		const dateOnly = '19 Oct';
		const dateTime = '19 Oct, 14:05';
		const first = render(<Chart {...base} xAxisType="time" />);
		expect(lastProps('Tooltip').labelFormatter(ts)).toBe(dateOnly);
		first.unmount();
		const second = render(<Chart {...base} xAxisType="time" xFormat="datetime" />);
		expect(lastProps('Tooltip').labelFormatter(ts)).toBe(dateTime);
		second.unmount();
		render(<Chart {...base} />);
		expect(lastProps('Tooltip').labelFormatter('10:05')).toBe('10:05');
	});

	it('formats the right axis ticks with the same yFormat and yUnit as the left one', () => {
		render(
			<Chart
				{...base}
				yFormat="number"
				yUnit=" ev"
				series={[
					{ key: 'a', name: 'A', type: 'line', yAxisId: 'left' },
					{ key: 'b', name: 'B', type: 'line', yAxisId: 'right' },
				]}
			/>,
		);
		const axes = rendered.calls.filter(c => c.name === 'YAxis');
		expect(axes.map(c => c.props.yAxisId)).toEqual(['left', 'right']);
		for (const axis of axes) {
			expect(axis.props.tickFormatter(950)).toBe('950 ev');
		}
	});

	it('appends yUnit to the tooltip value and keeps the series name', () => {
		render(<Chart {...base} yUnit="%" />);
		expect(lastProps('Tooltip').formatter(42, 'Events')).toEqual(['42%', 'Events']);
		const { unmount } = render(<Chart {...base} />);
		expect(lastProps('Tooltip').formatter(42, 'Events')).toEqual(['42', 'Events']);
		unmount();
	});

	it('draws a right axis only when a series uses it, and binds each series to its axis', () => {
		render(<Chart {...base} />);
		expect(rendered.calls.filter(c => c.name === 'YAxis').map(c => c.props.yAxisId)).toEqual(['left']);
		rendered.calls.length = 0;
		render(
			<Chart
				{...base}
				series={[
					{ key: 'a', name: 'A', type: 'line', yAxisId: 'left' },
					{ key: 'b', name: 'B', type: 'line', yAxisId: 'right' },
				]}
			/>,
		);
		const axes = rendered.calls.filter(c => c.name === 'YAxis').map(c => [c.props.yAxisId, c.props.orientation]);
		expect(axes).toContainEqual(['left', undefined]);
		expect(axes).toContainEqual(['right', 'right']);
		const right = lastProps('YAxis');
		expect(right).toMatchObject({ yAxisId: 'right', hide: false, width: 90, tickLine: false, axisLine: false });
		expect(right.tickFormatter(2048)).toBe('2.0 KB');
		expect(screen.getAllByTestId('Line').map(parseProps).map(p => p['yAxisId'])).toEqual(['left', 'right']);
	});

	it('the sparkline hides the right axis as well', () => {
		render(
			<Chart
				{...base}
				variant="sparkline"
				series={[
					{ key: 'a', name: 'A', type: 'line', yAxisId: 'left' },
					{ key: 'b', name: 'B', type: 'line', yAxisId: 'right' },
				]}
			/>,
		);
		expect(lastProps('YAxis')).toMatchObject({ yAxisId: 'right', hide: true, width: 0 });
	});

	it('a series without yAxisId goes to the left axis', () => {
		render(<Chart {...base} series={[{ key: 'a', name: 'A', type: 'bar' } as never]} />);
		expect(propsOf('Bar')['yAxisId']).toBe('left');
	});

	it('draws each series with its own component: line (default), bar, area with a translucent fill', () => {
		render(
			<Chart
				{...base}
				series={[
					{ key: 'l', name: 'L', type: 'line', yAxisId: 'left' },
					{ key: 'b', name: 'B', type: 'bar', yAxisId: 'left' },
					{ key: 'a', name: 'A', type: 'area', yAxisId: 'left' },
					{ key: 'x', name: 'X', type: undefined as never, yAxisId: 'left' },
				]}
			/>,
		);
		expect(screen.getAllByTestId('Line')).toHaveLength(2);
		expect(screen.getAllByTestId('Bar')).toHaveLength(1);
		expect(propsOf('Area')).toMatchObject({ dataKey: 'a', name: 'A', fillOpacity: 0.2, dot: false });
		expect(propsOf('Line')).toMatchObject({ dataKey: 'l', name: 'L', dot: false });
	});

	it('draws neither tick lines nor the Y axis line, and passes the data and height through', () => {
		render(<Chart {...base} height={180} />);
		expect(propsOf('XAxis')).toMatchObject({ tickLine: false, dataKey: 'label' });
		expect(propsOf('YAxis')).toMatchObject({ tickLine: false, axisLine: false, width: 90 });
		expect(propsOf('ResponsiveContainer')['height']).toBe(180);
		expect(propsOf('ComposedChart')['data']).toEqual(base.data);
	});

	it('the sparkline gives the Y axis no width and uses the compact margin and container', () => {
		const { container } = render(<Chart {...base} variant="sparkline" />);
		expect(propsOf('YAxis')['width']).toBe(0);
		expect(propsOf('ComposedChart')['margin']).toEqual({ top: 4, right: 4, bottom: 4, left: 4 });
		expect(container.firstElementChild).toHaveClass('p-2');
		expect(container.firstElementChild).not.toHaveClass('p-4');
	});

	it('a default chart has no margin override and the roomy container', () => {
		const { container } = render(<Chart {...base} />);
		expect(propsOf('ComposedChart')['margin']).toBeUndefined();
		expect(container.firstElementChild).toHaveClass('p-4');
	});

	it('the loading placeholder is announced, busy and still for reduced motion; the empty state keeps the height', () => {
		const loading = render(<Chart {...base} data={undefined} height={120} />);
		const bar = screen.getByRole('status', { name: 'Loading chart' });
		expect(bar).toHaveAttribute('aria-busy', 'true');
		expect(bar).toHaveClass('animate-pulse', 'motion-reduce:animate-none');
		expect(bar).toHaveStyle({ height: '120px' });
		loading.unmount();
		render(<Chart {...base} data={[]} height={90} />);
		expect(screen.getByText('No data')).toHaveStyle({ height: '90px' });
	});

	it('defaults the height to 300', () => {
		render(<Chart {...base} />);
		expect(propsOf('ResponsiveContainer')['height']).toBe(300);
	});

	it('does not warn about xFormat when it is unset', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		render(<Chart {...base} />);
		expect(warn).not.toHaveBeenCalled();
	});
});

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

	it('warns once per mount for every xFormat on a category axis, not again on a re-render with the same props', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { rerender } = render(<Chart {...base} xFormat="datetime" />);
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('xFormat "datetime" has no effect with xAxisType "category"'));
		rerender(<Chart {...base} xFormat="datetime" />);
		expect(warn).toHaveBeenCalledTimes(1);
		rerender(<Chart {...base} xFormat="date" />);
		expect(warn).toHaveBeenCalledTimes(2);
	});

	it('does not warn for xFormat on a time axis', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		render(<Chart {...base} xAxisType="time" xFormat="time" />);
		expect(warn).not.toHaveBeenCalled();
	});
});

describe('Chart fill', () => {
	const FILL = ['h-full', 'min-h-0', 'flex-1'];

	it('stretches the card and measures the plot inside a box that takes the room left, never below the floor', () => {
		const { container } = render(<Chart {...base} fill />);
		const card = container.firstElementChild as HTMLElement;
		expect(card).toHaveClass(...FILL, 'flex', 'flex-col', 'p-4');
		const plotBox = card.firstElementChild as HTMLElement;
		expect(plotBox).toHaveClass('flex-1', 'min-h-0', 'w-full');
		// 64 is the floor when `height` is not set: a tile cannot be squeezed to nothing.
		expect(plotBox).toHaveStyle({ minHeight: '64px' });
		expect(plotBox).toContainElement(screen.getByTestId('ResponsiveContainer'));
		// A percentage: the box above is what gives it a definite height.
		expect(propsOf('ResponsiveContainer')['height']).toBe('100%');
	});

	it('uses `height` as the floor under the parent room', () => {
		const { container } = render(<Chart {...base} fill height={180} />);
		expect((container.firstElementChild as HTMLElement).firstElementChild).toHaveStyle({ minHeight: '180px' });
	});

	it('keeps the compact card and fills it for a sparkline', () => {
		const { container } = render(<Chart {...base} fill variant="sparkline" />);
		expect(container.firstElementChild).toHaveClass(...FILL, 'p-2');
	});

	it('without fill nothing changes: an exact pixel height, no flex card, no plot box', () => {
		const { container } = render(<Chart {...base} height={180} />);
		const card = container.firstElementChild as HTMLElement;
		FILL.forEach(name => expect(card).not.toHaveClass(name));
		expect(card).not.toHaveClass('flex');
		expect(card.firstElementChild).toBe(screen.getByTestId('ResponsiveContainer'));
		expect(propsOf('ResponsiveContainer')['height']).toBe(180);
	});

	it('fill false (explicit) behaves like the default', () => {
		const { container } = render(<Chart {...base} fill={false} />);
		expect(container.firstElementChild).not.toHaveClass('h-full');
		expect(propsOf('ResponsiveContainer')['height']).toBe(300);
	});

	it('the loading placeholder and the empty state fill too, with the floor instead of an exact height', () => {
		const loading = render(<Chart {...base} data={undefined} fill />);
		const bar = screen.getByRole('status', { name: 'Loading chart' });
		expect(bar).toHaveClass(...FILL);
		expect(bar.style.minHeight).toBe('64px');
		expect(bar.style.height).toBe('');
		loading.unmount();
		render(<Chart {...base} data={[]} fill height={90} />);
		const empty = screen.getByText('No data');
		expect(empty).toHaveClass(...FILL);
		expect(empty.style.minHeight).toBe('90px');
		expect(empty.style.height).toBe('');
	});

	it('does not fill for a value that is not the boolean true', () => {
		const { container } = render(<Chart {...base} fill={'yes' as unknown as boolean} />);
		// Not even half of it: the flex card must not appear without the sizing classes.
		expect(container.firstElementChild).not.toHaveClass('h-full');
		expect(container.firstElementChild).not.toHaveClass('flex');
		expect(propsOf('ResponsiveContainer')['height']).toBe(300);
	});
});
