import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { JsonViewer } from './JsonViewer.js';

describe('JsonViewer', () => {
	it('pretty-prints valid JSON from the given field', () => {
		render(<JsonViewer row={{ payload: '{"a":1}' }} field="payload" />);
		expect(screen.getByText(/"a": 1/)).toBeInTheDocument();
	});

	it('has no inline max-height by default', () => {
		render(<JsonViewer row={{ payload: '{"a":1}' }} field="payload" />);
		const pre = screen.getByText(/"a": 1/).closest('pre');
		expect((pre as HTMLElement).style.maxHeight).toBe('');
	});

	it('applies maxHeight with scroll when provided', () => {
		render(<JsonViewer row={{ payload: '{"a":1}' }} field="payload" maxHeight="20rem" />);
		const pre = screen.getByText(/"a": 1/).closest('pre');
		expect(pre).toHaveStyle({ maxHeight: '20rem' });
		expect(pre?.className).toContain('overflow-y-auto');
	});
});
