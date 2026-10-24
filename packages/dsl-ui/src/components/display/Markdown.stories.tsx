import type { Meta, StoryObj } from '@storybook/react';

import { ColumnHelpers, DataTable } from '../table/DataTable.js';
import { Markdown } from './Markdown.js';

const SAMPLE = `# Rendered prompt

You are a **helpful** assistant. Follow these steps:

1. Read the input
2. Call the tool
3. Report back

- [x] context loaded
- [ ] answer written

| tool | calls |
|------|-------|
| search | 3 |
| fetch | 1 |

\`\`\`json
{ "query": "orders failed in the last hour", "limit": 20 }
\`\`\`

See [the docs](https://example.com/docs). Raw HTML is shown as text: <script>alert(1)</script>

![tracking pixel](https://example.com/pixel.png)
`;

const meta: Meta<typeof Markdown> = {
	title: 'Display/Markdown',
	component: Markdown,
	parameters: { layout: 'padded' },
	decorators: [Story => <div style={{ maxWidth: 560 }}><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof Markdown>;

export const Default: Story = { args: { text: SAMPLE } };

export const ScrollableWithMaxHeight: Story = { args: { text: SAMPLE, maxHeight: '14rem' } };

export const Collapsed: Story = { args: { text: SAMPLE, collapsed: true } };

// Images are an exfiltration channel from logs: opt in explicitly.
export const WithImagesAllowed: Story = { args: { text: SAMPLE, allowImages: true } };

// What flow-owner needs: a run log rendered inside a DataTable expansion panel.
export const InDataTableExpansion: Story = {
	render: () => {
		const rows = [
			{ id: 1, name: 'Run 1', log: SAMPLE },
			{ id: 2, name: 'Run 2', log: '## Short\n\nNothing to see.' },
		];
		type Row = (typeof rows)[number];
		return (
			<DataTable
				rows={rows}
				columns={[ColumnHelpers.text<Row>('name', 'Name')]}
				expansion={{ $type: 'Markdown' }}
				renderNode={(_node, ctx) => <Markdown text={(ctx['row'] as Row).log} maxHeight="16rem" />}
			/>
		);
	},
};
