import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { CronBuilder } from './CronBuilder.js';
import { FieldText } from './FieldText.js';

const meta: Meta<typeof CronBuilder> = {
	title: 'Form/CronBuilder',
	component: CronBuilder,
	parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof CronBuilder>;

/**
 * In place, under the field it edits - which is how a consumer uses it, and the only way to judge
 * whether the panel reads as a surface floating over the form.
 */
function InContext({ initial }: { initial: string }) {
	const [schedule, setSchedule] = useState(initial);
	const [open, setOpen] = useState(true);
	return (
		<div className="max-w-2xl space-y-1">
			<FieldText label="Schedule (cron expression)" value={schedule} onChange={setSchedule} />
			{open ? (
				<CronBuilder
					value={schedule}
					onChange={v => { setSchedule(v); setOpen(false); }}
					onClose={() => setOpen(false)}
				/>
			) : (
				<p className="text-xs text-muted">
					Applied <code className="text-content">{schedule}</code> - reopen from the wand in a real form.
				</p>
			)}
		</div>
	);
}

/** Defaults: daily, one hour. */
export const Default: Story = {
	render: () => <InContext initial="" />,
};

/**
 * The case that was broken.
 *
 * A job firing morning AND evening. The wizard could only hold one hour, so opening it here and
 * pressing Apply used to replace `10 10,19 * * *` with `10 10 * * *` - deleting the evening run
 * without saying anything. Both hours are preselected now, and Apply on an untouched panel emits
 * exactly what it opened with.
 */
export const TwiceDaily: Story = {
	render: () => <InContext initial="10 10,19 * * *" />,
};

/** Several hours on specific days - two dimensions at once. */
export const SpecificDaysSeveralHours: Story = {
	render: () => <InContext initial="30 6,12,18 * * 1,3,5" />,
};

/** Monthly, to check the day-of-month select sits in the row with everything else. */
export const Monthly: Story = {
	render: () => <InContext initial="0 8 15 * *" />,
};

/**
 * An expression the wizard cannot describe (stepped hours).
 *
 * It opens on its defaults rather than half-adopting the value - a spec that merely resembled the
 * expression would rewrite the schedule the moment Apply was pressed.
 */
export const UnsupportedExpression: Story = {
	render: () => <InContext initial="0 */2 * * *" />,
};

/** The panel on the dark theme, since its surface and border come from tokens. */
export const DarkTheme: Story = {
	render: () => (
		<div className="dark bg-bg p-4 rounded">
			<InContext initial="10 10,19 * * *" />
		</div>
	),
};
