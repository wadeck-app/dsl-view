// One component that throws while rendering must not blank the page: the node that failed shows a box naming the component and
// the error, every other node renders. The box is shown in production too, where the authoring warnings are compiled out and a
// blank page would be the only symptom.
import { render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createRegistry } from '../ComponentRegistry.js';
import { DslRenderer, renderChildren } from './DslRenderer.js';

function Boom({ message }: { message: string }): React.ReactElement {
	throw new Error(message);
}

const registry = createRegistry([
	{ name: 'Stack', category: 'disposition', tags: [], render: ({ node, registry: reg, ctx }) => <div data-testid="stack">{renderChildren(node['items'] as never, reg, ctx)}</div> },
	{ name: 'Text', category: 'atomic', tags: [], render: ({ node }) => <p>{String(node['text'])}</p> },
	{ name: 'Boom', category: 'atomic', tags: [], render: ({ node }) => <Boom message={String(node['message'])} /> },
]);

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined));
afterEach(() => vi.restoreAllMocks());

describe('a node that throws while rendering', () => {
	it('shows a box naming the component and the error, and keeps its siblings', () => {
		render(
			<DslRenderer
				registry={registry}
				node={{ $type: 'Stack', items: [{ $type: 'Text', text: 'before' }, { $type: 'Boom', message: 'needs either "urlParam" or "value"' }, { $type: 'Text', text: 'after' }] }}
			/>
		);
		expect(screen.getByText('before')).toBeInTheDocument();
		expect(screen.getByText('after')).toBeInTheDocument();
		const box = screen.getByRole('alert');
		expect(box).toHaveTextContent('[Boom]');
		expect(box).toHaveTextContent('needs either "urlParam" or "value"');
	});

	it('reports the error to the console with the component name', () => {
		render(<DslRenderer registry={registry} node={{ $type: 'Boom', message: 'bad props' }} />);
		const logged = (console.error as unknown as ReturnType<typeof vi.fn>).mock.calls.map(call => String(call[0])).join('\n');
		expect(logged).toContain('[Boom]');
		expect(logged).toContain('bad props');
	});

	it('the box is also shown in production', () => {
		vi.stubEnv('NODE_ENV', 'production');
		render(<DslRenderer registry={registry} node={{ $type: 'Boom', message: 'bad props' }} />);
		expect(screen.getByRole('alert')).toHaveTextContent('[Boom] failed to render: bad props');
		vi.unstubAllEnvs();
	});

	it('recovers when the node is replaced by one that renders', () => {
		const { rerender } = render(<DslRenderer registry={registry} node={{ $type: 'Boom', message: 'bad props' }} />);
		expect(screen.getByRole('alert')).toBeInTheDocument();
		rerender(<DslRenderer registry={registry} node={{ $type: 'Text', text: 'fixed' }} />);
		expect(screen.queryByRole('alert')).toBeNull();
		expect(screen.getByText('fixed')).toBeInTheDocument();
	});

	it('a node that renders is untouched: no box, no extra element', () => {
		const { container } = render(<DslRenderer registry={registry} node={{ $type: 'Text', text: 'ok' }} />);
		expect(container.innerHTML).toBe('<p>ok</p>');
	});
});
