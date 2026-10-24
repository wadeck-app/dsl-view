import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { JsonViewer } from './JsonViewer.js';

describe('JsonViewer', () => {
	it('pretty-prints valid JSON from the given field', () => {
		render(<JsonViewer row={{ payload: '{"a":1}' }} field="payload" />);
		expect(screen.getByText(/"a": 1/)).toBeInTheDocument();
	});

	it('pretty-prints a field that is already an object (not "[object Object]")', () => {
		const { container } = render(<JsonViewer row={{ payload: { a: 1, b: [2, 3] } }} field="payload" />);
		expect(container.querySelector('pre')!.textContent).toBe(JSON.stringify({ a: 1, b: [2, 3] }, null, 2));
	});

	it('pretty-prints an array field', () => {
		const { container } = render(<JsonViewer row={{ payload: [1, 2] }} field="payload" />);
		expect(container.querySelector('pre')!.textContent).toBe(JSON.stringify([1, 2], null, 2));
	});

	it('shows text that is not JSON as is', () => {
		const { container } = render(<JsonViewer row={{ payload: 'plain text' }} field="payload" />);
		expect(container.querySelector('pre')!.textContent).toBe('plain text');
	});

	it('shows nothing for a missing field, a null field, or no field name', () => {
		const missing = render(<JsonViewer row={{}} field="payload" />);
		expect(missing.container.querySelector('pre')!.textContent).toBe('');
		missing.unmount();
		const nul = render(<JsonViewer row={{ payload: null }} field="payload" />);
		expect(nul.container.querySelector('pre')!.textContent).toBe('');
		nul.unmount();
		const noField = render(<JsonViewer row={{ payload: '{"a":1}' }} />);
		expect(noField.container.querySelector('pre')!.textContent).toBe('');
	});

	it('shows a scalar number field as text', () => {
		const { container } = render(<JsonViewer row={{ n: 42 }} field="n" />);
		expect(container.querySelector('pre')!.textContent).toBe('42');
	});

	it('shows falsy scalars (0, false) instead of treating them as missing', () => {
		const zero = render(<JsonViewer row={{ n: 0 }} field="n" />);
		expect(zero.container.querySelector('pre')!.textContent).toBe('0');
		zero.unmount();
		const no = render(<JsonViewer row={{ ok: false }} field="ok" />);
		expect(no.container.querySelector('pre')!.textContent).toBe('false');
	});

	it('re-indents compact JSON text exactly (two spaces, nested arrays one item per line)', () => {
		const { container } = render(<JsonViewer row={{ payload: '{"a":1,"b":[1,2]}' }} field="payload" />);
		expect(container.querySelector('pre')!.textContent).toBe('{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}');
	});

	it('shows truncated or invalid JSON raw instead of throwing or hiding it', () => {
		const { container } = render(<JsonViewer row={{ payload: '{"a":' }} field="payload" />);
		expect(container.querySelector('pre')!.textContent).toBe('{"a":');
	});

	it('shows JSON scalars given as text in their JSON form', () => {
		const str = render(<JsonViewer row={{ p: '"x"' }} field="p" />);
		expect(str.container.querySelector('pre')!.textContent).toBe('"x"');
		str.unmount();
		const num = render(<JsonViewer row={{ p: '42' }} field="p" />);
		expect(num.container.querySelector('pre')!.textContent).toBe('42');
	});

	it('renders markup in the payload as text, never as elements', () => {
		const { container } = render(<JsonViewer row={{ payload: '<img src=x onerror=alert(1)><script>1</script>' }} field="payload" />);
		expect(container.querySelector('img, script')).toBeNull();
		expect(container.querySelector('pre')!.textContent).toBe('<img src=x onerror=alert(1)><script>1</script>');
	});

	it('shows nothing when there is no row at all', () => {
		const { container } = render(<JsonViewer field="payload" />);
		expect(container.querySelector('pre')!.textContent).toBe('');
	});

	it('treats an empty maxHeight like no maxHeight (no inline style, no extra scroll class)', () => {
		const { container } = render(<JsonViewer row={{ payload: '{"a":1}' }} field="payload" maxHeight="" />);
		const pre = container.querySelector('pre') as HTMLElement;
		expect(pre.style.maxHeight).toBe('');
		expect(pre.className).not.toContain('overflow-y-auto');
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
