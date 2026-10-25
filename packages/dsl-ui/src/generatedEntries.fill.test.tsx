// `fill` through the REAL generated registry and the real DslRenderer: the layout only works if the renderer inserts no
// element between a container and its children (a wrapper div would break the `h-full` / `flex-1` chain), and if the
// props written in YAML reach the components as booleans. jsdom has no layout, so this pins the DOM chain; the sizes
// themselves are checked in a browser (Layout/Fill a dashboard tile stories). Needs `npm run build` in dsl-renderer
// (workspace build, not the published copy in node_modules: see scripts/generate-known-keys.ts).
import { render, waitFor } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FILL_CLASSES } from '@dsl-ui/utils/fillClasses.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const packagesDir = path.resolve(here, '../..');
const generatorPath = path.resolve(packagesDir, 'dsl-renderer/dist/build/entriesGenerator.js');
const appRoot = path.join(packagesDir, '__entries-fill-app');

let DslRenderer: typeof import('../../dsl-renderer/dist/index.js').DslRenderer;
let registry: ReturnType<typeof import('../../dsl-renderer/dist/index.js').createRegistry>;

beforeAll(async () => {
	if (!fs.existsSync(generatorPath)) {
		throw new Error(`dsl-renderer is not built (${generatorPath} missing): run \`npm run build\` in packages/dsl-renderer first.`);
	}
	const { buildEntriesFile } = await import(/* @vite-ignore */ generatorPath);
	const content: string = buildEntriesFile(appRoot, [
		{ pkg: 'dsl-ui', absDir: path.join(packagesDir, 'dsl-ui/src/components/display') },
		{ pkg: 'dsl-ui', absDir: path.join(packagesDir, 'dsl-ui/src/components/layout') },
	]);
	const entriesPath = path.join(appRoot, 'src/generated/entries.tsx');
	fs.mkdirSync(path.dirname(entriesPath), { recursive: true });
	fs.writeFileSync(entriesPath, content);
	const { allEntries } = await import(/* @vite-ignore */ entriesPath);
	const renderer = await import('../../dsl-renderer/dist/index.js');
	DslRenderer = renderer.DslRenderer;
	registry = renderer.createRegistry(allEntries);
}, 300_000);

afterAll(() => {
	fs.rmSync(appRoot, { recursive: true, force: true });
});

const FILL = FILL_CLASSES.split(' ');

const TILE = {
	$type: 'Card',
	fill: true,
	items: [
		{
			$type: 'VerticalStack',
			fill: true,
			gap: 'gap-2',
			items: [
				{ $type: 'StatTile', label: 'Last hour', value: '68.6 kg', compact: true, nowrap: true },
				{
					$type: 'Chart',
					fill: true,
					data: [{ hour: '08', events: 12 }],
					xAxisKey: 'hour',
					xAxisType: 'category',
					series: [{ key: 'events', name: 'Events', type: 'bar' }],
				},
			],
		},
	],
};

describe('fill through the generated registry', () => {
	it('keeps one chain of fill elements from the card to the chart, with no wrapper element in between', async () => {
		const { container } = render(
			<MemoryRouter>
				<div data-testid="tile" style={{ width: 300, height: 250 }}>
					<DslRenderer node={TILE} registry={registry} />
				</div>
			</MemoryRouter>,
		);
		// Chart is a lazy entry: its first import (recharts) is slow on a loaded machine, so the default 1 s wait is too short.
		await waitFor(() => expect(container.querySelector('.recharts-responsive-container')).not.toBeNull(), { timeout: 30_000 });

		const tile = container.querySelector('[data-testid="tile"]') as HTMLElement;
		const card = tile.firstElementChild as HTMLElement;
		FILL.forEach(name => expect(card).toHaveClass(name));

		// card > body > stack > [stat tile, chart card]: each step is a direct child.
		const body = card.firstElementChild as HTMLElement;
		expect(body).toHaveClass('flex', 'flex-col', 'flex-1', 'min-h-0');
		const stack = body.firstElementChild as HTMLElement;
		FILL.forEach(name => expect(stack).toHaveClass(name));
		expect(stack).toHaveClass('flex', 'flex-col', 'gap-2');

		const [stat, chartCard] = Array.from(stack.children) as HTMLElement[];
		expect(stat).toHaveTextContent('Last hour');
		expect(stat).toHaveClass('p-2.5');
		FILL.forEach(name => expect(chartCard).toHaveClass(name));
		expect(chartCard.querySelector('.recharts-responsive-container')).not.toBeNull();
	});

	it('a row with itemSizes keeps the chain: each sized wrapper stretches and hosts its filling child as a direct child', async () => {
		const { container } = render(
			<MemoryRouter>
				<DslRenderer
					registry={registry}
					node={{
						$type: 'HorizontalStack',
						fill: true,
						itemSizes: ['fixed', 'flex'],
						items: [
							{ $type: 'Card', fill: true, items: [{ $type: 'StatTile', label: 'Last hour', value: '18' }] },
							{ $type: 'Card', fill: true, items: [{ $type: 'StatTile', label: 'Total', value: '210' }] },
						],
					}}
				/>
			</MemoryRouter>,
		);
		const row = container.firstElementChild as HTMLElement;
		FILL.forEach(name => expect(row).toHaveClass(name));
		// The row keeps its default alignment: the wrappers stretch by themselves.
		expect(row).toHaveClass('items-center');
		const [fixed, flex] = Array.from(row.children) as HTMLElement[];
		expect(fixed).toHaveClass('w-80', 'shrink-0', 'self-stretch', 'flex', 'flex-col', 'min-h-0');
		expect(flex).toHaveClass('flex-1', 'min-w-0', 'self-stretch', 'flex', 'flex-col', 'min-h-0');
		for (const wrapper of [fixed, flex]) {
			expect(wrapper.children).toHaveLength(1);
			FILL.forEach(name => expect(wrapper.firstElementChild).toHaveClass(name));
		}
		expect(fixed).toHaveTextContent('Last hour');
		expect(flex).toHaveTextContent('Total');
	});

	it('the figure of a YAML-authored nowrap tile keeps its unit on one line', async () => {
		const { container } = render(
			<MemoryRouter>
				<DslRenderer node={{ $type: 'StatTile', label: 'Weight', value: '68.6 kg', nowrap: true }} registry={registry} />
			</MemoryRouter>,
		);
		const figure = container.querySelector('p.font-bold') as HTMLElement;
		expect(figure).toHaveClass('whitespace-nowrap');
		expect(figure).toHaveAttribute('title', '68.6 kg');
	});

	it('without fill in the YAML nothing of the fill layout is applied', async () => {
		const { container } = render(
			<MemoryRouter>
				<DslRenderer
					node={{ $type: 'Card', items: [{ $type: 'VerticalStack', items: [{ $type: 'StatTile', label: 'x', value: '1' }] }] }}
					registry={registry}
				/>
			</MemoryRouter>,
		);
		const card = container.firstElementChild as HTMLElement;
		FILL.forEach(name => expect(card).not.toHaveClass(name));
		expect(container.querySelector('.h-full')).toBeNull();
	});
});
