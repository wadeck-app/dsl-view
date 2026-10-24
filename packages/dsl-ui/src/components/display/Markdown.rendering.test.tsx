import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Markdown } from './Markdown.js';

afterEach(() => {
	vi.restoreAllMocks();
});

// Structure is asserted through roles, not through the classes that style it.
describe('Markdown structure', () => {
	it('renders the six heading levels as real headings of the same level', () => {
		render(<Markdown text={['# one', '## two', '### three', '#### four', '##### five', '###### six'].join('\n\n')} />);

		for (const [level, name] of [[1, 'one'], [2, 'two'], [3, 'three'], [4, 'four'], [5, 'five'], [6, 'six']] as const) {
			expect(screen.getByRole('heading', { level, name })).toBeInTheDocument();
		}
	});

	it('renders unordered and ordered lists as lists, with their items', () => {
		render(<Markdown text={['- apple', '- pear', '', '1. first', '2. second'].join('\n')} />);

		const lists = screen.getAllByRole('list');
		expect(lists.map(list => list.tagName)).toStrictEqual(['UL', 'OL']);
		expect(screen.getAllByRole('listitem').map(item => item.textContent)).toStrictEqual(['apple', 'pear', 'first', 'second']);
	});

	it('renders a blockquote, a thematic break and inline code', () => {
		const { container } = render(<Markdown text={['> quoted', '', '---', '', 'use `npm test` here'].join('\n')} />);

		expect(container.querySelector('blockquote')).toHaveTextContent('quoted');
		expect(screen.getByRole('separator')).toBeInTheDocument();
		expect(screen.getByText('npm test').tagName).toBe('CODE');
	});

	it('renders a GFM table with its header cells and data cells inside a scrollable wrapper', () => {
		const { container } = render(<Markdown text={['| name | n |', '| --- | --- |', '| a | 1 |'].join('\n')} />);

		expect(screen.getAllByRole('columnheader').map(cell => cell.textContent)).toStrictEqual(['name', 'n']);
		expect(screen.getAllByRole('cell').map(cell => cell.textContent)).toStrictEqual(['a', '1']);
		expect(container.querySelector('table')!.parentElement).toHaveClass('overflow-x-auto');
	});

	it('renders task lists as read-only checkboxes that reflect the markup', () => {
		render(<Markdown text={['- [x] done', '- [ ] todo'].join('\n')} />);

		const [done, todo] = screen.getAllByRole('checkbox') as HTMLInputElement[];
		expect(done!.checked).toBe(true);
		expect(todo!.checked).toBe(false);
		expect(done!.disabled && todo!.disabled).toBe(true);
	});
});

describe('Markdown images', () => {
	it('are shown as a placeholder with their alt text by default, and nothing is requested', () => {
		const { container } = render(<Markdown text="![a cat](https://example.com/cat.png)" />);

		expect(container.querySelector('img')).toBeNull();
		expect(screen.getByText('[image: a cat]')).toBeInTheDocument();
	});

	it('a placeholder without alt text just says "image"', () => {
		render(<Markdown text="![](https://example.com/cat.png)" />);

		expect(screen.getByText('[image]')).toBeInTheDocument();
	});

	it('with allowImages they load lazily without sending a referrer, and keep their alt (empty when absent)', () => {
		const { container } = render(<Markdown allowImages text={'![a cat](https://example.com/cat.png)\n\n![](https://example.com/dog.png)'} />);

		const [cat, dog] = Array.from(container.querySelectorAll('img'));
		expect(cat).toHaveAttribute('src', 'https://example.com/cat.png');
		expect(cat).toHaveAttribute('alt', 'a cat');
		expect(cat).toHaveAttribute('loading', 'lazy');
		expect(cat).toHaveAttribute('referrerpolicy', 'no-referrer');
		expect(dog).toHaveAttribute('alt', '');
	});

	it('even with allowImages, an image whose url is not http(s) is not loaded', () => {
		const { container } = render(<Markdown allowImages text="![x](javascript:alert(1))" />);

		expect(container.querySelector('img')).toBeNull();
	});
});

describe('Markdown text input', () => {
	// YAML can author a bare number or boolean even though the prop is typed as a string: feed them as such.
	it('shows numbers and booleans as text, and nothing for null or undefined', () => {
		const { rerender, container } = render(<Markdown text={42 as never} />);
		expect(container).toHaveTextContent('42');

		rerender(<Markdown text={true as never} />);
		expect(container).toHaveTextContent('true');

		rerender(<Markdown text={null as never} />);
		expect(container.textContent).toBe('');
		rerender(<Markdown text={undefined as never} />);
		expect(container.textContent).toBe('');
	});

	it('an object or an array renders nothing and is reported once with the kind of value it got', () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const { rerender, container } = render(<Markdown text={{ a: 1 } as never} />);
		expect(container.textContent).toBe('');

		rerender(<Markdown text={['x'] as never} />);
		expect(container.textContent).toBe('');

		const messages = consoleError.mock.calls.map(call => String(call[0]));
		expect(messages.some(message => message.includes('got object'))).toBe(true);
		expect(messages.some(message => message.includes('got an array'))).toBe(true);
	});
});
