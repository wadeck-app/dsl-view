import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HorizontalStack } from './HorizontalStack.js';
import { PageContent } from './PageContent.js';
import { VerticalStack } from './VerticalStack.js';

afterEach(() => {
	vi.restoreAllMocks();
});

function spyWarn() {
	return vi.spyOn(console, 'warn').mockImplementation(() => undefined);
}

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

	it('says nothing for the default or a known gap', () => {
		const warn = spyWarn();

		render(
			<VerticalStack gap="gap-12">
				<span>a</span>
			</VerticalStack>
		);
		render(
			<VerticalStack>
				<span>b</span>
			</VerticalStack>
		);

		expect(warn).not.toHaveBeenCalled();
	});

	it('an unknown gap is reported once with the allowed values, and still applied as written', () => {
		const warn = spyWarn();
		const { rerender } = render(
			<VerticalStack gap={'gap-lots' as never}>
				<span>a</span>
			</VerticalStack>
		);
		rerender(
			<VerticalStack gap={'gap-lots' as never}>
				<span>a</span>
			</VerticalStack>
		);

		expect(screen.getByText('a').parentElement).toHaveClass('gap-lots');
		expect(warn).toHaveBeenCalledTimes(1);
		const message = String(warn.mock.calls[0]![0]);
		expect(message).toContain('[VerticalStack] unknown gap "gap-lots"');
		expect(message).toContain('Allowed values: gap-0, gap-0.5, gap-1,');
		expect(message).toContain('gap-16.');
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

	it('says nothing when every choice is known', () => {
		const warn = spyWarn();

		render(
			<HorizontalStack gap="gap-2" align="items-end" justify="justify-between" itemSizes={['fixed', 'flex']}>
				<span>a</span>
				<span>b</span>
			</HorizontalStack>
		);

		expect(warn).not.toHaveBeenCalled();
	});

	it('an unknown gap is reported once with the allowed values, and still applied as written', () => {
		const warn = spyWarn();
		const { rerender } = render(
			<HorizontalStack gap={'gap-99' as never}>
				<span>a</span>
			</HorizontalStack>
		);
		rerender(
			<HorizontalStack gap={'gap-99' as never}>
				<span>a</span>
			</HorizontalStack>
		);

		expect(screen.getByText('a').parentElement).toHaveClass('gap-99');
		expect(warn).toHaveBeenCalledTimes(1);
		const message = String(warn.mock.calls[0]![0]);
		expect(message).toContain('[HorizontalStack] unknown gap "gap-99"');
		expect(message).toContain('Allowed values: gap-0, gap-0.5, gap-1,');
		expect(message).toContain('gap-16.');
	});

	it('reports an unknown align and an unknown justify, each by its own name', () => {
		const warn = spyWarn();
		render(
			<HorizontalStack align={'items-middle' as never} justify={'justify-spread' as never}>
				<span>a</span>
			</HorizontalStack>
		);

		const messages = warn.mock.calls.map(call => String(call[0]));
		expect(messages).toHaveLength(2);
		expect(messages[0]).toContain('unknown align "items-middle"');
		expect(messages[0]).toContain('items-start, items-center, items-end, items-stretch, items-baseline');
		expect(messages[1]).toContain('unknown justify "justify-spread"');
	});

	it('an unknown item size is reported with fixed and flex, and its wrapper is rendered without a class', () => {
		const warn = spyWarn();
		render(
			<HorizontalStack itemSizes={['huge' as never, 'flex', undefined]}>
				<span>a</span>
				<span>b</span>
				<span>c</span>
			</HorizontalStack>
		);

		expect(warn).toHaveBeenCalledTimes(1);
		expect(String(warn.mock.calls[0]![0])).toContain('[HorizontalStack] unknown itemSizes "huge"');
		expect(String(warn.mock.calls[0]![0])).toContain('Allowed values: fixed, flex.');
		expect(screen.getByText('a').parentElement).not.toHaveAttribute('class');
		expect(screen.getByText('b').parentElement).toHaveClass('flex-1', 'min-w-0');
		// An entry left undefined renders its child unwrapped, as before.
		expect(screen.getByText('c').parentElement).toHaveClass('flex');
	});

	it('a value that is a prototype property name is not mistaken for a known choice', () => {
		const warn = spyWarn();
		render(
			<HorizontalStack gap={'constructor' as never}>
				<span>a</span>
			</HorizontalStack>
		);

		expect(String(warn.mock.calls[0]![0])).toContain('unknown gap "constructor"');
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
