import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { codeTextOf, MarkdownCodeBlock } from './MarkdownCodeBlock.js';

// Minimal hast shapes: only the fields codeTextOf reads.
type HastNode = Parameters<typeof codeTextOf>[0];
const el = (tagName: string, children: unknown[]) => ({ type: 'element', tagName, properties: {}, children });
const text = (value: string) => ({ type: 'text', value });
const pre = (children: unknown[]) => el('pre', children) as unknown as HastNode;

describe('codeTextOf', () => {
	it('returns the text of the <code> child, without the newline hast appends to a fenced block', () => {
		expect(codeTextOf(pre([el('code', [text('const a = 1;\nconst b = 2;\n')])]))).toBe('const a = 1;\nconst b = 2;');
	});

	it('keeps a text that has no trailing newline, and only drops ONE trailing newline', () => {
		expect(codeTextOf(pre([el('code', [text('x')])]))).toBe('x');
		expect(codeTextOf(pre([el('code', [text('x\n\n')])]))).toBe('x\n');
	});

	it('joins the text pieces of a highlighted block and skips nested elements', () => {
		expect(codeTextOf(pre([el('code', [text('a'), el('span', [text('IGNORED')]), text('b\n')])]))).toBe('ab');
	});

	it('is empty when there is no node, no <code> child, or the <code> is not an element', () => {
		expect(codeTextOf(undefined)).toBe('');
		expect(codeTextOf(pre([el('span', [text('not code')])]))).toBe('');
		expect(codeTextOf(pre([]))).toBe('');
		expect(codeTextOf(pre([text('bare text')]))).toBe('');
	});
});

describe('MarkdownCodeBlock copy button', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	function stubClipboard(writeText: ((value: string) => Promise<void>) | undefined) {
		vi.stubGlobal('navigator', { ...navigator, clipboard: writeText ? { writeText } : undefined });
	}

	async function clickCopy() {
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
		});
	}

	it('copies exactly the code it was given, then says "Copied" and goes back to "Copy" after two seconds', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		stubClipboard(writeText);
		render(<MarkdownCodeBlock code={'line 1\nline 2'}>shown</MarkdownCodeBlock>);
		expect(screen.getByRole('status')).toHaveTextContent('Copy');

		await clickCopy();

		expect(writeText).toHaveBeenCalledTimes(1);
		expect(writeText).toHaveBeenCalledWith('line 1\nline 2');
		expect(screen.getByRole('status')).toHaveTextContent('Copied');

		await act(async () => {
			await vi.advanceTimersByTimeAsync(1_999);
		});
		expect(screen.getByRole('status')).toHaveTextContent('Copied');
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1);
		});
		expect(screen.getByRole('status')).toHaveTextContent('Copy');
		expect(screen.getByRole('status')).not.toHaveTextContent('Copied');
	});

	it('shows "Copy failed" and logs the reason when the clipboard API is missing', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		stubClipboard(undefined);
		render(<MarkdownCodeBlock code="x">shown</MarkdownCodeBlock>);

		await clickCopy();

		expect(screen.getByRole('status')).toHaveTextContent('Copy failed');
		expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('the clipboard API is not available in this context'));
	});

	it('shows "Copy failed" with the rejection reason when writing is refused (and a non-Error rejection is still readable)', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		stubClipboard(vi.fn().mockRejectedValue(new Error('permission denied')));
		const { unmount } = render(<MarkdownCodeBlock code="x">shown</MarkdownCodeBlock>);
		await clickCopy();
		expect(screen.getByRole('status')).toHaveTextContent('Copy failed');
		expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('permission denied'));
		unmount();

		stubClipboard(vi.fn().mockRejectedValue('denied as a string'));
		render(<MarkdownCodeBlock code="y">shown</MarkdownCodeBlock>);
		await clickCopy();
		expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('denied as a string'));
	});

	it('unmounting during the "Copied" delay leaves no timer behind', async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const { unmount } = render(<MarkdownCodeBlock code="x">shown</MarkdownCodeBlock>);
		await clickCopy();

		unmount();

		expect(vi.getTimerCount()).toBe(0);
	});

	it('renders the code it wraps inside a <pre>', () => {
		stubClipboard(undefined);
		render(<MarkdownCodeBlock code="x"><code>visible code</code></MarkdownCodeBlock>);

		expect(screen.getByText('visible code').closest('pre')).not.toBeNull();
	});
});
