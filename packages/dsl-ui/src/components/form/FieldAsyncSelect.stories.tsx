import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { FieldAsyncSelect, type FieldAsyncSelectOption } from './FieldAsyncSelect.js';

const meta: Meta<typeof FieldAsyncSelect> = {
	title: 'Form/FieldAsyncSelect',
	component: FieldAsyncSelect,
	parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof FieldAsyncSelect>;

const allCountries: FieldAsyncSelectOption[] = [
	{ value: 'us', label: 'United States' },
	{ value: 'ca', label: 'Canada' },
	{ value: 'uk', label: 'United Kingdom' },
	{ value: 'fr', label: 'France' },
	{ value: 'de', label: 'Germany' },
	{ value: 'es', label: 'Spain' },
	{ value: 'it', label: 'Italy' },
	{ value: 'pt', label: 'Portugal' },
	{ value: 'nl', label: 'Netherlands' },
	{ value: 'au', label: 'Australia' },
];

/** Simulates an async search with 400ms network delay. */
function searchCountries(query: string): Promise<FieldAsyncSelectOption[]> {
	return new Promise(resolve => {
		setTimeout(() => {
			const q = query.toLowerCase();
			resolve(
				q.length === 0
					? allCountries
					: allCountries.filter(c => c.label.toLowerCase().includes(q)),
			);
		}, 400);
	});
}

/** Always returns an empty array after a short delay. */
function searchEmpty(_query: string): Promise<FieldAsyncSelectOption[]> {
	return new Promise(resolve => setTimeout(() => resolve([]), 300));
}

function Controlled(args: React.ComponentProps<typeof FieldAsyncSelect>) {
	const [value, setValue] = useState<string | null>(args.value ?? null);
	return (
		<div style={{ width: 320 }}>
			<FieldAsyncSelect
				{...args}
				value={value}
				onChange={v => {
					setValue(v);
					args.onChange?.(v);
				}}
			/>
		</div>
	);
}

export const Default: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Country',
		description: 'Type to search. Results load after 400 ms.',
		loadOptions: searchCountries,
		placeholder: 'Search countries...',
	},
};

export const WithInitialValue: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Country',
		loadOptions: searchCountries,
		placeholder: 'Search countries...',
		// The value is set; the label will appear once the user interacts or clears.
		// Consumers can store the label alongside the value for immediate display.
		value: 'de',
	},
};

export const EmptyResults: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Category',
		description: 'Every search returns no results.',
		loadOptions: searchEmpty,
		placeholder: 'Try searching...',
		noOptionsMessage: 'No categories found',
	},
};

export const ErrorState: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Country',
		loadOptions: searchCountries,
		placeholder: 'Search countries...',
		required: true,
		error: 'Please select a country',
	},
};

export const Disabled: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Country',
		loadOptions: searchCountries,
		placeholder: 'Disabled',
		disabled: true,
	},
};
