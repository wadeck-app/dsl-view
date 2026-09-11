import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { FieldMultiSelect } from './FieldMultiSelect.js';

const meta: Meta<typeof FieldMultiSelect> = {
	title: 'Form/FieldMultiSelect',
	component: FieldMultiSelect,
	parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof FieldMultiSelect>;

const fruits = [
	{ value: 'apple', label: 'Apple' },
	{ value: 'banana', label: 'Banana' },
	{ value: 'cherry', label: 'Cherry' },
	{ value: 'date', label: 'Date' },
	{ value: 'elderberry', label: 'Elderberry' },
	{ value: 'fig', label: 'Fig' },
	{ value: 'grape', label: 'Grape' },
];

function Controlled(args: React.ComponentProps<typeof FieldMultiSelect>) {
	const [value, setValue] = useState<string[]>(args.value ?? []);
	return (
		<div style={{ width: 360 }}>
			<FieldMultiSelect {...args} value={value} onChange={setValue} />
		</div>
	);
}

export const Default: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Favourite Fruits',
		options: fruits,
		placeholder: 'Select fruits...',
		description: 'Choose one or more fruits.',
	},
};

export const WithInitialSelections: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Favourite Fruits',
		options: fruits,
		value: ['apple', 'cherry'],
	},
};

export const MaxSelectedLimit: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Top 3 Fruits',
		description: 'You can select at most 3 fruits.',
		options: fruits,
		maxSelected: 3,
		placeholder: 'Pick up to 3...',
	},
};

export const Disabled: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Favourite Fruits',
		options: fruits,
		value: ['banana', 'grape'],
		disabled: true,
	},
};

export const FormIntegration: Story = {
	render: () => {
		const [value, setValue] = useState<string[]>(['apple']);
		const [submitted, setSubmitted] = useState<string | null>(null);

		function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
			e.preventDefault();
			const fd = new FormData(e.currentTarget);
			setSubmitted(JSON.stringify(fd.getAll('fruits')));
		}

		return (
			<div style={{ width: 360 }}>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<FieldMultiSelect
						label="Fruits"
						options={fruits}
						value={value}
						onChange={setValue}
						name="fruits"
						required
					/>
					<button type="submit" className="px-4 py-2 bg-primary text-white rounded text-sm">
						Submit
					</button>
				</form>
				{submitted && (
					<p className="mt-4 text-sm text-content">
						Submitted: <code>{submitted}</code>
					</p>
				)}
			</div>
		);
	},
};
