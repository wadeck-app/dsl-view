import type { Meta, StoryObj } from '@storybook/react';
import { useRef, useState } from 'react';

import { Button } from '../controls/_Button.js';
import { FieldSecret } from './FieldSecret.js';
import type { FieldSecretHandle } from './FieldSecret.js';

const meta: Meta<typeof FieldSecret> = {
	title: 'Form/FieldSecret',
	component: FieldSecret,
	parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof FieldSecret>;

// The owner reads the text only when it submits, then wipes it: the typed text is never in React state.
export const ReadOnSubmit: Story = {
	render: () => {
		const ref = useRef<FieldSecretHandle>(null);
		const [length, setLength] = useState<number | null>(null);
		const submit = () => {
			setLength(ref.current?.read().length ?? 0);
			ref.current?.clear();
		};
		return (
			<div className="w-72 space-y-2">
				<FieldSecret ref={ref} label="Passphrase" description="Cleared after submit." onEnter={submit} />
				<Button onClick={submit}>Submit</Button>
				{length !== null && <p className="text-xs text-muted">Submitted {length} characters.</p>}
			</div>
		);
	},
};

export const WithError: Story = {
	render: () => <FieldSecret label="Passphrase" error="Too short" />,
};
