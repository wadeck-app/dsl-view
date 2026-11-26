// Two columns, a main one and a side one, that stack below the lg breakpoint (the page-level split of a detail view).
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SplitLayout } from './SplitLayout.js';

const tree = (props: Partial<React.ComponentProps<typeof SplitLayout>> = {}) =>
	render(<SplitLayout main={<p>document</p>} side={<p>facts</p>} {...props} />);
const root = () => screen.getByTestId('split-layout');
const side = () => screen.getByTestId('split-layout-side');

describe('SplitLayout', () => {
	it('puts main first and the side column on the right, stacked below lg', () => {
		tree();
		expect(root()).toHaveClass('flex', 'flex-col', 'lg:flex-row');
		expect(screen.getByTestId('split-layout-main')).toHaveTextContent('document');
		expect(side()).toHaveTextContent('facts');
		expect(screen.getByTestId('split-layout-main')).toHaveClass('min-w-0', 'flex-1');
	});

	it('sidePosition left reverses the row from lg up only', () => {
		tree({ sidePosition: 'left' });
		expect(root()).toHaveClass('lg:flex-row-reverse');
		expect(root()).not.toHaveClass('lg:flex-row');
	});

	it.each([['narrow', 'lg:w-64'], ['normal', 'lg:w-80'], ['wide', 'lg:w-96']] as const)('sideWidth %s is %s', (sideWidth, cls) => {
		tree({ sideWidth });
		expect(side()).toHaveClass(cls);
	});

	it('the side column is sticky from lg up by default, under the top offset given', () => {
		tree({ stickyTop: 'top-16' });
		expect(side()).toHaveClass('lg:sticky', 'lg:top-16', 'lg:self-start');
	});

	it('sticky false removes it', () => {
		tree({ sticky: false });
		expect(side().className).not.toContain('sticky');
	});

	it('sideFirstWhenStacked puts the side column above the main one below lg', () => {
		tree({ sideFirstWhenStacked: true });
		expect(side()).toHaveClass('max-lg:order-first');
	});

	it('an unknown sideWidth is reported and falls back to normal', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		// @ts-expect-error -- a DSL page can write any string
		tree({ sideWidth: 'huge' });
		expect(side()).toHaveClass('lg:w-80');
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('[SplitLayout] unknown sideWidth "huge"'));
	});
});
