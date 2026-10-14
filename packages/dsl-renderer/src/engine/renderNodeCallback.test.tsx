import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import type { ComponentRegistryEntry } from '../ComponentRegistry.js';
import { createRegistry } from '../ComponentRegistry.js';
import { resolveExpressionValue, renderChildren } from './DslRenderer.js';
import { DslRenderer } from './DslRenderer.js';

// Reproduces the exact bug reported for DataTable's `renderNode` (expansion rows): a
// (node, ctx) => ReactNode prop was being resolved via resolveExpressionValue(node['renderNode'], ctx),
// which is always undefined since no YAML can author a function literal - so a click on the
// expand toggle never rendered anything. entriesGenerator.ts now wires this class of prop to
// renderChildren([n], registry, { ...ctx, ...extraCtx })[0] instead (see entriesGenerator.test.ts
// for the codegen-level assertion). This test proves the runtime mechanism that fix relies on:
// a real click revealing real content resolved from the merged per-call ctx (e.g. { row }).

const EchoEntry: ComponentRegistryEntry = {
	name: 'Echo',
	category: 'atomic',
	tags: [],
	render: ({ node, ctx }) => <span>{String(resolveExpressionValue(node['text'], ctx) ?? '')}</span>,
};

// Hand-written exactly as entriesGenerator now generates for a (node, ctx) => ReactNode prop.
const ExpandableRowEntry: ComponentRegistryEntry = {
	name: 'ExpandableRow',
	category: 'atomic',
	tags: [],
	render: ({ node, registry, ctx }) => {
		const expansion = resolveExpressionValue(node['expansion'], ctx) as unknown;
		const renderNode = (n: unknown, extraCtx: Record<string, unknown>) =>
			renderChildren([n], registry, { ...ctx, ...extraCtx })[0] ?? null;
		return <ExpandableRow expansion={expansion} renderNode={renderNode} />;
	},
};

function ExpandableRow({
	expansion,
	renderNode,
}: {
	expansion: unknown;
	renderNode: (node: unknown, ctx: Record<string, unknown>) => React.ReactNode;
}) {
	const [open, setOpen] = React.useState(false);
	return (
		<div>
			<button onClick={() => setOpen(o => !o)}>toggle</button>
			{open && expansion ? renderNode(expansion, { row: { payload: 'row-42-payload' } }) : null}
		</div>
	);
}

describe('renderNode-shaped prop (DataTable expansion pattern)', () => {
	it('clicking the toggle renders real content resolved from the per-call ctx', () => {
		const registry = createRegistry([EchoEntry, ExpandableRowEntry]);
		const node = {
			$type: 'ExpandableRow',
			expansion: { $type: 'Echo', text: '$ctx.row.payload' },
		};

		render(<DslRenderer node={node} registry={registry} ctx={{}} />);

		expect(screen.queryByText('row-42-payload')).not.toBeInTheDocument();
		fireEvent.click(screen.getByText('toggle'));
		expect(screen.getByText('row-42-payload')).toBeInTheDocument();
	});
});
