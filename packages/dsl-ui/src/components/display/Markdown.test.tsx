import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ColumnHelpers, DataTable } from '../table/DataTable.js';
import { Markdown } from './Markdown.js';

// reportOnce remembers messages for the whole module lifetime: every test that asserts a console.error needs a distinct text.
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
	Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
});

describe('Markdown rendering', () => {
	it('renders headings, emphasis, lists and inline code', () => {
		const { container } = render(<Markdown text={'# Title\n\nSome **bold** and `code`.\n\n- one\n- two\n'} />);
		expect(screen.getByRole('heading', { level: 1, name: 'Title' })).toBeInTheDocument();
		expect(container.querySelector('strong')!.textContent).toBe('bold');
		expect(container.querySelectorAll('li')).toHaveLength(2);
		expect(container.querySelector('p code')!.textContent).toBe('code');
		// Inline code is not a fenced block: no copy button.
		expect(screen.queryByRole('button', { name: 'Copy code' })).toBeNull();
	});

	it('renders GFM tables inside a scroll container', () => {
		const { container } = render(<Markdown text={'| a | b |\n|---|---|\n| 1 | 2 |\n'} />);
		expect(container.querySelectorAll('th')).toHaveLength(2);
		expect(container.querySelector('td')!.textContent).toBe('1');
		expect(container.querySelector('table')!.parentElement!.className).toContain('overflow-x-auto');
	});

	it('renders GFM task lists as read-only checkboxes', () => {
		render(<Markdown text={'- [x] done\n- [ ] todo\n'} />);
		const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
		expect(boxes.map(box => box.checked)).toEqual([true, false]);
		expect(boxes.every(box => box.disabled)).toBe(true);
	});

	it('renders nothing for an undefined text (data not loaded yet) without an error', () => {
		const { container } = render(<Markdown />);
		expect(container.textContent).toBe('');
		expect(errorSpy).not.toHaveBeenCalled();
	});

	it('names the problem and renders nothing when text is not a string', () => {
		const { container } = render(<Markdown text={{ not: 'a string' } as unknown as string} />);
		expect(container.textContent).toBe('');
		expect(errorSpy).toHaveBeenCalledWith('[Markdown] `text` must be a string, got object: nothing is rendered.');
	});
});

describe('Markdown safety', () => {
	it('shows raw HTML as text and never creates the elements', () => {
		const { container } = render(
			<Markdown text={'before <script>alert(1)</script> <iframe src="https://evil.example"></iframe> <img src=x onerror=alert(1)> after'} />,
		);
		expect(container.querySelector('script, iframe, img')).toBeNull();
		expect(container.textContent).toContain('<script>alert(1)</script>');
		expect(container.textContent).toContain('<iframe src="https://evil.example"></iframe>');
		expect(container.textContent).toContain('<img src=x onerror=alert(1)>');
	});

	it.each([
		['javascript:', '[click](javascript:alert(1))'],
		['data:', '[click](data:text/html;base64,PHNjcmlwdD4=)'],
		['an upper-case JAVASCRIPT:', '[click](JAVASCRIPT:alert(1))'],
		['a relative path', '[click](/modules/queue)'],
		['an ftp url', '[click](ftp://example.com/file)'],
	])('keeps the text of a link to %s but renders no anchor', (_name, source) => {
		const { container } = render(<Markdown text={source} />);
		expect(container.querySelector('a')).toBeNull();
		expect(container.textContent).toBe('click');
	});

	it('opens http, https and mailto links in a new tab without opener or referrer', () => {
		const { container } = render(<Markdown text={'[a](https://example.com/a) [b](http://example.com/b) [c](mailto:me@example.com)'} />);
		const anchors = Array.from(container.querySelectorAll('a'));
		expect(anchors.map(a => a.getAttribute('href'))).toEqual(['https://example.com/a', 'http://example.com/b', 'mailto:me@example.com']);
		for (const a of anchors) {
			expect(a.getAttribute('target')).toBe('_blank');
			expect(a.getAttribute('rel')).toBe('noopener noreferrer');
		}
	});

	it('does not load images by default: the alt text is shown instead', () => {
		const { container } = render(<Markdown text={'![the logo](https://evil.example/pixel.png?leak=1)'} />);
		expect(container.querySelector('img')).toBeNull();
		expect(container.textContent).toBe('[image: the logo]');
	});

	it('shows a bare marker for an image without alt text', () => {
		const { container } = render(<Markdown text={'![](https://evil.example/pixel.png)'} />);
		expect(container.textContent).toBe('[image]');
	});

	it('loads images only with allowImages, lazily and without a referrer', () => {
		const { container } = render(<Markdown allowImages text={'![the logo](https://example.com/logo.png)'} />);
		const img = container.querySelector('img')!;
		expect(img.getAttribute('src')).toBe('https://example.com/logo.png');
		expect(img.getAttribute('alt')).toBe('the logo');
		expect(img.getAttribute('loading')).toBe('lazy');
		expect(img.getAttribute('referrerpolicy')).toBe('no-referrer');
	});

	it('does not load an image with a javascript: or data: source even with allowImages', () => {
		const { container } = render(<Markdown allowImages text={'![x](javascript:alert(1)) ![y](data:image/png;base64,AAAA)'} />);
		expect(container.querySelector('img')).toBeNull();
	});
});

describe('Markdown code blocks', () => {
	const FENCE = '```ts\nconst a = 1;\nconst b = 2;\n```';

	it('renders a fenced block as a monospace block with a copy button', () => {
		const { container } = render(<Markdown text={FENCE} />);
		const pre = container.querySelector('pre')!;
		expect(pre.className).toContain('font-mono');
		expect(pre.textContent).toBe('const a = 1;\nconst b = 2;\n');
		expect(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument();
	});

	it('copies exactly the code text, without the trailing newline, then shows Copied and resets', async () => {
		vi.useFakeTimers();
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
		render(<Markdown text={FENCE} />);
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
		});
		expect(writeText).toHaveBeenCalledTimes(1);
		expect(writeText).toHaveBeenCalledWith('const a = 1;\nconst b = 2;');
		expect(screen.getByRole('status')).toHaveTextContent('Copied');
		act(() => {
			vi.advanceTimersByTime(2000);
		});
		expect(screen.getByRole('status')).toHaveTextContent('Copy');
		expect(screen.getByRole('status')).not.toHaveTextContent('Copied');
	});

	it('copies a block with an empty line in the middle unchanged', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
		render(<Markdown text={'```\nfirst\n\nthird\n```'} />);
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
		});
		expect(writeText).toHaveBeenCalledWith('first\n\nthird');
	});

	it('shows a visible failure and logs the reason when the clipboard API is missing', async () => {
		Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
		render(<Markdown text={FENCE} />);
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
		});
		expect(screen.getByRole('status')).toHaveTextContent('Copy failed');
		expect(errorSpy).toHaveBeenCalledWith('[Markdown] could not copy the code block: the clipboard API is not available in this context.');
	});

	it('shows a visible failure when the clipboard rejects', async () => {
		Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('denied by policy')) }, configurable: true });
		render(<Markdown text={FENCE} />);
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
		});
		expect(screen.getByRole('status')).toHaveTextContent('Copy failed');
		expect(errorSpy).toHaveBeenCalledWith('[Markdown] could not copy the code block: denied by policy.');
	});
});

describe('Markdown layout', () => {
	it('caps the height with a keyboard-scrollable labelled region', () => {
		render(<Markdown maxHeight="10rem" text={'# Long'} />);
		const region = screen.getByRole('region', { name: 'Markdown content' });
		expect(region).toHaveStyle({ maxHeight: '10rem' });
		expect(region.className).toContain('overflow-y-auto');
		expect(region).toHaveAttribute('tabindex', '0');
	});

	it('has no region and no tab stop without maxHeight', () => {
		render(<Markdown text={'# Short'} />);
		expect(screen.queryByRole('region')).toBeNull();
	});

	it('starts folded when collapsed, and the toggle expands and folds it', () => {
		const { container } = render(<Markdown collapsed text={'# Hidden by default\n\nbody'} />);
		const toggle = screen.getByRole('button', { name: 'Show more' });
		const content = container.querySelector(`#${CSS.escape(toggle.getAttribute('aria-controls')!)}`)!;
		expect(toggle).toHaveAttribute('aria-expanded', 'false');
		expect(content.className).toContain('overflow-hidden');
		fireEvent.click(toggle);
		expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true');
		expect(content.className).not.toContain('overflow-hidden');
		fireEvent.click(screen.getByRole('button', { name: 'Show less' }));
		expect(screen.getByRole('button', { name: 'Show more' })).toHaveAttribute('aria-expanded', 'false');
	});

	it('has no toggle when not collapsed', () => {
		render(<Markdown text={'# Open'} />);
		expect(screen.queryByRole('button', { name: /Show/ })).toBeNull();
	});

	it('works in a DataTable expansion panel', () => {
		const rows = [{ id: 1, name: 'Run 1', log: '## Prompt\n\n- step one\n- step two' }];
		render(
			<DataTable
				rows={rows}
				columns={[ColumnHelpers.text<(typeof rows)[number]>('name', 'Name')]}
				expansion={{ $type: 'Markdown' }}
				renderNode={(_node, ctx) => <Markdown text={(ctx['row'] as (typeof rows)[number]).log} />}
			/>,
		);
		expect(screen.queryByRole('heading', { name: 'Prompt' })).toBeNull();
		fireEvent.click(screen.getAllByRole('button')[0]!);
		expect(screen.getByRole('heading', { name: 'Prompt' })).toBeInTheDocument();
		expect(screen.getAllByRole('listitem')).toHaveLength(2);
	});
});
