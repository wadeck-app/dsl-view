import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HorizontalStack } from './HorizontalStack.js';
import { PageContent } from './PageContent.js';
import { VerticalStack } from './VerticalStack.js';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('VerticalStack', () => {
	it('stacks its children in a column with the default gap, or the gap it is given', () => {
		const { container, rerender } = render(
			<VerticalStack>
				<p>one</p>
				<p>two</p>
			</VerticalStack>
		);
		const root = container.firstElementChild as HTMLElement;
		expect(root).toHaveClass('flex', 'flex-col', 'gap-4');
		expect(root.textContent).toBe('onetwo');

		rerender(<VerticalStack gap="gap-8">x</VerticalStack>);
		expect(container.firstElementChild).toHaveClass('flex-col', 'gap-8');
		expect(container.firstElementChild).not.toHaveClass('gap-4');
	});
});

describe('HorizontalStack', () => {
	it('defaults to a centred row with gap-3, and justify only when asked', () => {
		const { container, rerender } = render(<HorizontalStack>x</HorizontalStack>);
		const root = () => container.firstElementChild as HTMLElement;
		expect(root().className).toBe('flex gap-3 items-center');

		rerender(<HorizontalStack gap="gap-1" align="items-start" justify="justify-between">x</HorizontalStack>);
		expect(root().className).toBe('flex gap-1 items-start justify-between');
	});

	it('without itemSizes, or with none of them set, children are not wrapped', () => {
		const { container, rerender } = render(
			<HorizontalStack>
				<span>a</span>
				<span>b</span>
			</HorizontalStack>
		);
		expect(container.firstElementChild!.children).toHaveLength(2);
		expect(container.firstElementChild!.children[0]!.tagName).toBe('SPAN');

		rerender(
			<HorizontalStack itemSizes={[undefined, undefined]}>
				<span>a</span>
				<span>b</span>
			</HorizontalStack>
		);
		expect(container.firstElementChild!.children[0]!.tagName).toBe('SPAN');
	});

	it('itemSizes wraps exactly the children that opt in: fixed is a 20rem rail, flex shares the rest', () => {
		const { container } = render(
			<HorizontalStack itemSizes={['fixed', undefined, 'flex']}>
				<span>side</span>
				<span>loose</span>
				<span>main</span>
			</HorizontalStack>
		);

		const [first, second, third] = Array.from(container.firstElementChild!.children) as HTMLElement[];
		expect(first!.tagName).toBe('DIV');
		expect(first).toHaveClass('w-80', 'shrink-0');
		expect(first!.textContent).toBe('side');
		expect(second!.tagName).toBe('SPAN');
		expect(third!.tagName).toBe('DIV');
		expect(third).toHaveClass('flex-1', 'min-w-0');
		expect(third!.textContent).toBe('main');
	});

	it('a child beyond the end of a shorter itemSizes list is left unwrapped', () => {
		const { container } = render(
			<HorizontalStack itemSizes={['flex']}>
				<span>a</span>
				<span>b</span>
			</HorizontalStack>
		);

		const [first, second] = Array.from(container.firstElementChild!.children) as HTMLElement[];
		expect(first!.tagName).toBe('DIV');
		expect(second!.tagName).toBe('SPAN');
	});
});

describe('PageContent', () => {
	it.each([
		['sm', 'max-w-2xl'],
		['md', 'max-w-4xl'],
		['lg', 'max-w-5xl'],
		['xl', 'max-w-6xl'],
		['2xl', 'max-w-7xl'],
		['full', 'max-w-full'],
	] as const)('maxWidth "%s" maps to %s', (name, cls) => {
		const { container } = render(<PageContent maxWidth={name} sections={<p>body</p>} />);

		expect(container.firstElementChild).toHaveClass('mx-auto', 'w-full', cls);
	});

	it('defaults to "xl" and renders the sections spaced vertically', () => {
		const { container } = render(<PageContent sections={<p>body</p>} />);

		expect(container.firstElementChild).toHaveClass('max-w-6xl');
		expect(screen.getByText('body').parentElement).toHaveClass('space-y-4');
	});

	it('an unknown width name is reported with the valid ones and falls back to the default, never to a class called "undefined"', () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

		const { container } = render(<PageContent maxWidth={'huge' as never} sections={<p>body</p>} />);

		expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('"huge"'));
		expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('sm, md, lg, xl, 2xl, full'));
		expect(container.firstElementChild!.className).not.toContain('undefined');
		expect(container.firstElementChild).toHaveClass('max-w-6xl');
	});
});
