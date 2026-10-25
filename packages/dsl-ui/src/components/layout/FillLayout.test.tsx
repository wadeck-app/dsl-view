// `fill`: a widget root that takes the room its dashboard tile gives it. jsdom has no layout engine, so these tests pin
// the structure the layout relies on (which element carries the classes, what stays untouched when `fill` is off); the
// real sizes are checked in a browser (FillTile stories) and through the generated registry (fill.registry.test.tsx).
import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { FILL_CLASSES } from '@dsl-ui/utils/fillClasses.js';
import { Card } from './Card.js';
import { HorizontalStack } from './HorizontalStack.js';
import { ScrollArea } from './ScrollArea.js';
import { Section } from './Section.js';
import { StatTile } from './StatTile.js';
import { VerticalStack } from './VerticalStack.js';

const FILL = FILL_CLASSES.split(' ');

function expectFill(element: Element | null): void {
	expect(element).not.toBeNull();
	FILL.forEach(name => expect(element).toHaveClass(name));
}

function expectNoFill(element: Element | null): void {
	expect(element).not.toBeNull();
	FILL.forEach(name => expect(element).not.toHaveClass(name));
}

describe('VerticalStack fill', () => {
	it('adds the fill classes to its own element and keeps the column layout and gap', () => {
		const { container } = render(<VerticalStack fill gap="gap-2"><p>x</p></VerticalStack>);
		const root = container.firstElementChild;
		expectFill(root);
		expect(root).toHaveClass('flex', 'flex-col', 'gap-2');
	});

	it('is unchanged without fill (default)', () => {
		const { container } = render(<VerticalStack><p>x</p></VerticalStack>);
		expectNoFill(container.firstElementChild);
		expect(container.firstElementChild?.className).toBe('flex flex-col gap-4');
	});

	it('does not fill for a value that is not the boolean true', () => {
		const { container } = render(<VerticalStack fill={'yes' as unknown as boolean}><p>x</p></VerticalStack>);
		expectNoFill(container.firstElementChild);
	});
});

describe('HorizontalStack fill', () => {
	it('adds the fill classes to the row and keeps gap, alignment and justification', () => {
		const { container } = render(<HorizontalStack fill gap="gap-1" align="items-stretch" justify="justify-between"><p>x</p></HorizontalStack>);
		const root = container.firstElementChild;
		expectFill(root);
		expect(root).toHaveClass('flex', 'gap-1', 'items-stretch', 'justify-between');
	});

	it('also fills when it wraps its children for itemSizes', () => {
		const { container } = render(<HorizontalStack fill itemSizes={['flex', undefined]}><p>a</p><p>b</p></HorizontalStack>);
		expectFill(container.firstElementChild);
		expect(container.firstElementChild?.firstElementChild).toHaveClass('flex-1', 'min-w-0');
	});

	it('is unchanged without fill (default)', () => {
		const { container } = render(<HorizontalStack><p>x</p></HorizontalStack>);
		expect(container.firstElementChild?.className).toBe('flex gap-3 items-center');
	});
});

describe('Card fill', () => {
	it('stretches the card, shrinks nothing but the body, and lets the body host filling children', () => {
		const { container } = render(
			<Card fill header={<span>head</span>} footer={<span>foot</span>}><p>body</p></Card>,
		);
		const root = container.firstElementChild as HTMLElement;
		expectFill(root);
		expect(root).toHaveClass('flex', 'flex-col');
		const [header, body, footer] = Array.from(root.children);
		expect(header).toHaveClass('shrink-0');
		expect(footer).toHaveClass('shrink-0');
		// The body takes what header and footer leave and is itself a column, so a `fill` child inside it can stretch.
		expect(body).toHaveClass('flex', 'flex-col', 'flex-1', 'min-h-0');
		expect(body).toContainElement(screen.getByText('body'));
	});

	it('is unchanged without fill: no flex on the card, a plain block body', () => {
		const { container } = render(<Card header={<span>head</span>} footer={<span>foot</span>}><p>body</p></Card>);
		const root = container.firstElementChild as HTMLElement;
		expectNoFill(root);
		expect(root).not.toHaveClass('flex');
		const [header, body, footer] = Array.from(root.children);
		expect(header).not.toHaveClass('shrink-0');
		expect(footer).not.toHaveClass('shrink-0');
		expect(body).not.toHaveClass('flex');
		expect(body).not.toHaveClass('flex-1');
	});

	it('does not half-apply the layout for a value that is not the boolean true', () => {
		const { container } = render(<Card fill={'yes' as unknown as boolean} header={<span>h</span>}><p>body</p></Card>);
		const root = container.firstElementChild as HTMLElement;
		expectNoFill(root);
		expect(root).not.toHaveClass('flex');
		expect(root.children[0]).not.toHaveClass('shrink-0');
		expect(root.children[1]).not.toHaveClass('flex');
	});

	it('keeps clickable behaviour with fill', () => {
		render(<Card fill onClick={() => {}}><p>body</p></Card>);
		expect(screen.getByRole('button')).toHaveClass('cursor-pointer', 'h-full');
	});
});

describe('Section fill', () => {
	it('stretches the section as a column and keeps the title region', () => {
		render(<Section fill title="Disk"><p>body</p></Section>);
		const region = screen.getByRole('region', { name: 'Disk' });
		expectFill(region);
		expect(region).toHaveClass('flex', 'flex-col', 'space-y-6');
	});

	it('is unchanged without fill, and for a value that is not the boolean true', () => {
		const { container } = render(<Section title="Disk"><p>body</p></Section>);
		expect(container.firstElementChild?.className).toBe('space-y-6');
		const odd = render(<Section title="Odd" fill={'yes' as unknown as boolean}><p>body</p></Section>);
		expect(odd.container.firstElementChild?.className).toBe('space-y-6');
	});
});

describe('ScrollArea fill', () => {
	it('fills and keeps the scrolling classes', () => {
		const { container } = render(<ScrollArea fill axis="both"><p>x</p></ScrollArea>);
		const root = container.firstElementChild;
		expectFill(root);
		expect(root).toHaveClass('overflow-auto');
	});

	it('is unchanged without fill', () => {
		const { container } = render(<ScrollArea><p>x</p></ScrollArea>);
		expect(container.firstElementChild?.className).toBe('min-h-0 overflow-y-auto overflow-x-hidden');
	});
});

describe('StatTile fill, nowrap and compact', () => {
	it('fill adds the fill classes to the tile and keeps its look', () => {
		const { container } = render(<StatTile label="Disk" value="68.6 kg" fill />);
		const root = container.firstElementChild;
		expectFill(root);
		expect(root).toHaveClass('flex', 'flex-col', 'p-4', 'gap-2', 'border');
	});

	it('fill also applies to a link tile', () => {
		render(<StatTile label="Disk" value={3} fill href="/disk" />);
		const link = screen.getByRole('link');
		expectFill(link);
	});

	it('default figure can wrap: no nowrap class and no tooltip', () => {
		render(<StatTile label="Weight" value="68.6 kg" />);
		const figure = screen.getByText('68.6 kg');
		expect(figure).not.toHaveClass('whitespace-nowrap');
		expect(figure).not.toHaveAttribute('title');
	});

	it('nowrap keeps the figure (unit included) on one line, cut with an ellipsis, and exposes the full text as a tooltip', () => {
		render(<StatTile label="Weight" value="68.6 kg" nowrap />);
		const figure = screen.getByText('68.6 kg');
		expect(figure).toHaveClass('whitespace-nowrap', 'overflow-hidden', 'text-ellipsis');
		expect(figure).toHaveAttribute('title', '68.6 kg');
	});

	it('nowrap gives a numeric figure a text tooltip too', () => {
		render(<StatTile label="Count" value={1753} nowrap />);
		expect(screen.getByText('1753')).toHaveAttribute('title', '1753');
	});

	it('compact tightens the padding, the gap and the figure size', () => {
		const { container } = render(<StatTile label="Weight" value="68" compact />);
		const root = container.firstElementChild;
		expect(root).toHaveClass('p-2.5', 'gap-1');
		expect(root).not.toHaveClass('p-4');
		expect(screen.getByText('68')).toHaveClass('text-xl');
		expect(screen.getByText('68')).not.toHaveClass('text-2xl');
	});

	it('default keeps the 2xl figure and the roomy padding', () => {
		const { container } = render(<StatTile label="Weight" value="68" />);
		expect(container.firstElementChild).toHaveClass('p-4', 'gap-2');
		expect(screen.getByText('68')).toHaveClass('text-2xl');
	});

	it('the loading skeleton fills too, so the tile does not jump when the figure arrives', () => {
		render(<StatTile label="x" value="1" loading fill />);
		expectFill(screen.getByTestId('stat-tile-loading'));
	});
});
