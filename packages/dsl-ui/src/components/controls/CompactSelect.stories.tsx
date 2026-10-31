import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { CompactSelect } from './CompactSelect.js';
import { PageSizeSelect } from './PageSizeSelect.js';

import { MemoryRouter, useLocation } from 'react-router-dom';
import { RouterProvider } from '../navigation/RouterProvider.js';

const meta: Meta<typeof CompactSelect> = {
	title: 'Controls/CompactSelect',
	component: CompactSelect,
	parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof CompactSelect>;

const RUNS = [
	{ value: 'r3', label: '19 Sep 09:30' },
	{ value: 'r2', label: '18 Sep 19:05' },
	{ value: 'r1', label: '18 Sep 10:00' },
];

function Controlled(args: React.ComponentProps<typeof CompactSelect>) {
	const [value, setValue] = useState(args.value);
	return (
		<div>
			<CompactSelect {...args} value={value} onChange={setValue} />
			<p style={{ marginTop: 16, fontSize: 14, color: '#666' }}>Selected: {value || '(none)'}</p>
		</div>
	);
}

export const Default: Story = {
	render: args => <Controlled {...args} />,
	args: { value: 'r3', options: RUNS, ariaLabel: 'Run' },
};

export const WithPlaceholder: Story = {
	render: args => <Controlled {...args} />,
	args: { value: '', options: RUNS, ariaLabel: 'Run', placeholder: 'All runs' },
};

export const Disabled: Story = {
	render: args => <Controlled {...args} />,
	args: { value: 'r3', options: RUNS, ariaLabel: 'Run', disabled: true },
};

/** Why it exists: in a toolbar row beside the pagination select it must not be the odd one out. */
export const InAToolbar: Story = {
	render: () => {
		const [run, setRun] = useState('r3');
		const [size, setSize] = useState(25);
		return (
			<div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 520 }}>
				<CompactSelect value={run} options={RUNS} onChange={setRun} ariaLabel="Run" />
				<CompactSelect
					value="all"
					options={[{ value: 'all', label: 'All levels' }, { value: 'error', label: 'Errors only' }]}
					onChange={() => {}}
					ariaLabel="Log level"
				/>
				<span style={{ marginLeft: 'auto' }}>
					<PageSizeSelect value={size} options={[25, 50, 100]} onChange={setSize} />
				</span>
			</div>
		);
	},
};

const RANGES = [
	{ value: '1M', label: '1 month' },
	{ value: '6M', label: '6 months' },
	{ value: '1Y', label: '1 year' },
];

// urlParam stories need the URL service a real page has: RouterProvider over a MemoryRouter, with the current query shown.
function UrlBacked(args: React.ComponentProps<typeof CompactSelect>) {
	const { search } = useLocation();
	return (
		<div>
			<CompactSelect {...args} />
			<p style={{ marginTop: 16, fontSize: 14, color: '#666' }}>URL query: {search || '(empty)'}</p>
		</div>
	);
}

function inUrl(initialEntry: string): NonNullable<Story['decorators']> {
	return [
		Story => (
			<MemoryRouter initialEntries={[initialEntry]}>
				<RouterProvider>
					<Story />
				</RouterProvider>
			</MemoryRouter>
		),
	];
}

/** `defaultValue` is shown while the URL has no `range`; the URL stays empty until a choice is made. */
export const UrlParamWithDefault: Story = {
	decorators: inUrl('/'),
	render: args => <UrlBacked {...args} />,
	args: { value: '', onChange: () => {}, urlParam: 'range', options: RANGES, ariaLabel: 'Period', defaultValue: '6M' },
};

/** A `range` in the URL wins over `defaultValue`. */
export const UrlValueBeatsDefault: Story = {
	decorators: inUrl('/?range=1Y'),
	render: args => <UrlBacked {...args} />,
	args: { value: '', onChange: () => {}, urlParam: 'range', options: RANGES, ariaLabel: 'Period', defaultValue: '6M' },
};

/** A value no option carries (hand-edited link) is shown as a disabled "Unknown: <value>" option, not as the first option. */
export const UnknownUrlValue: Story = {
	decorators: inUrl('/?range=2Y'),
	render: args => <UrlBacked {...args} />,
	args: { value: '', onChange: () => {}, urlParam: 'range', options: RANGES, ariaLabel: 'Period', defaultValue: '6M' },
};

/** With a placeholder, picking it writes an empty `range`; the default does not come back. */
export const DefaultWithPlaceholder: Story = {
	decorators: inUrl('/'),
	render: args => <UrlBacked {...args} />,
	args: { value: '', onChange: () => {}, urlParam: 'range', options: RANGES, ariaLabel: 'Period', placeholder: 'Any period', defaultValue: '6M' },
};
