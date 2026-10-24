import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import React, { useSyncExternalStore } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { createRegistry, DslRenderer, renderChildren, resolveExpressionValue } from '@wadeck-app/dsl-renderer';

import { AbExperiments, useAbExperiments } from './AbExperiments.js';
import { AbTest } from './AbTest.js';
import { isDev } from './isDev.js';
import { useAbTest } from './useAbTest.js';

vi.mock('./isDev.js', () => ({ isDev: vi.fn(() => false) }));

// The registry entries below do what the generated ones do for this component (checked against the real generator
// output in dsl-renderer's entriesGenerator.test): plain props resolved from the node, `renderNode` re-entering the
// DSL renderer for one sub-node.
const registry = createRegistry([
	{ name: 'Label', category: 'atomic', tags: [], render: ({ node }) => <p>{String(node['label'])}</p> },
	{
		name: 'AbTest',
		category: 'disposition',
		tags: ['layout'],
		render: ({ node, registry: reg, ctx }) => (
			<AbTest
				id={resolveExpressionValue(node['id'], ctx) as string}
				label={resolveExpressionValue(node['label'], ctx) as string}
				initial={resolveExpressionValue(node['initial'], ctx) as string}
				variants={resolveExpressionValue(node['variants'], ctx) as never}
				renderNode={(n, extra) => renderChildren([n], reg, { ...ctx, ...extra })[0] ?? null}
			/>
		),
	},
]);

const variant = (label: string, view: unknown) => ({ label, hint: `Shows ${label}.`, view });
const label = (text: string) => ({ $type: 'Label', label: text });
const experiment = (id: string, views: Record<string, unknown>, initial = Object.keys(views)[0]!) => ({
	$type: 'AbTest',
	id,
	label: `Test ${id}`,
	initial,
	variants: Object.fromEntries(Object.entries(views).map(([key, view]) => [key, variant(key.toUpperCase(), view)])),
});

function Page({ node, enabled = true, tests }: { node: Record<string, unknown>; enabled?: boolean; tests?: React.ComponentProps<typeof AbExperiments>['tests'] }) {
	return (
		<AbExperiments enabled={enabled} tests={tests}>
			<DslRenderer node={node} registry={registry} />
		</AbExperiments>
	);
}

const rowOf = (name: string) => within(screen.getByRole('group', { name }));

let errorSpy: MockInstance<typeof console.error>;
let warnSpy: MockInstance<typeof console.warn>;

beforeEach(() => {
	localStorage.clear();
	window.history.pushState({}, '', '/');
	vi.mocked(isDev).mockReturnValue(false);
	errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	window.history.pushState({}, '', '/');
});

describe('AbTest node, experiments enabled', () => {
	it('renders the initial variant, and the dock offers one button per variant with its hint', () => {
		render(<Page node={experiment('render-1', { a: label('view A'), b: label('view B') })} />);
		expect(screen.getByText('view A')).toBeInTheDocument();
		expect(screen.queryByText('view B')).not.toBeInTheDocument();
		const row = rowOf('Test render-1');
		expect(row.getByRole('button', { name: 'A' })).toHaveAttribute('aria-pressed', 'true');
		expect(row.getByRole('button', { name: 'B' })).toHaveAttribute('title', 'Shows B.');
	});

	it('switches the view, stores the choice and restores it after a remount', () => {
		const node = experiment('switch-1', { a: label('view A'), b: label('view B') });
		const first = render(<Page node={node} />);
		fireEvent.click(rowOf('Test switch-1').getByRole('button', { name: 'B' }));
		expect(screen.getByText('view B')).toBeInTheDocument();
		expect(screen.queryByText('view A')).not.toBeInTheDocument();
		expect(localStorage.getItem('ab.switch-1')).toBe('b');
		first.unmount();
		render(<Page node={node} />);
		expect(screen.getByText('view B')).toBeInTheDocument();
	});

	it('lets a link force a variant for this page load without storing it', () => {
		window.history.pushState({}, '', '/?ab.link-1=b');
		render(<Page node={experiment('link-1', { a: label('view A'), b: label('view B') })} />);
		expect(screen.getByText('view B')).toBeInTheDocument();
		expect(localStorage.getItem('ab.link-1')).toBeNull();
	});

	it('reports an unknown stored variant and falls back to the initial one', () => {
		localStorage.setItem('ab.stale-1', 'gone');
		render(<Page node={experiment('stale-1', { a: label('view A'), b: label('view B') })} />);
		expect(screen.getByText('view A')).toBeInTheDocument();
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"gone"'));
	});

	it('keeps ONE dock for every AbTest of the page, in declaration order, and keeps that order after a choice', () => {
		const node = { $type: 'Label', label: 'unused' };
		const page = (
			<AbExperiments enabled>
				<DslRenderer node={experiment('multi-a', { a: label('a1'), b: label('a2') })} registry={registry} />
				<DslRenderer node={experiment('multi-b', { a: label('b1'), b: label('b2') })} registry={registry} />
				<DslRenderer node={node} registry={registry} />
			</AbExperiments>
		);
		render(page);
		expect(screen.getAllByTestId('ab-dock')).toHaveLength(1);
		const names = () => screen.getAllByRole('group').map((g) => g.getAttribute('aria-label'));
		expect(names()).toEqual(['Test multi-a', 'Test multi-b']);
		fireEvent.click(rowOf('Test multi-a').getByRole('button', { name: 'B' }));
		expect(names()).toEqual(['Test multi-a', 'Test multi-b']);
	});

	it('shows the tests the host declared with useAbTest in the same dock, before the ones from views', () => {
		function Host() {
			const color = useAbTest({ id: 'host-color', label: 'Host color', initial: 'red', options: { red: { label: 'Red', hint: 'r' }, blue: { label: 'Blue', hint: 'b' } } });
			return <Page node={experiment('host-1', { a: label('view A'), b: label('view B') })} tests={[color]} />;
		}
		render(<Host />);
		expect(screen.getAllByTestId('ab-dock')).toHaveLength(1);
		expect(screen.getAllByRole('group').map((g) => g.getAttribute('aria-label'))).toEqual(['Host color', 'Test host-1']);
	});

	it('shares one row and one choice between identical declarations of the same test', () => {
		const same = experiment('same-1', { a: label('view A'), b: label('view B') });
		render(
			<AbExperiments enabled>
				<DslRenderer node={same} registry={registry} />
				<DslRenderer node={same} registry={registry} />
			</AbExperiments>
		);
		expect(screen.getAllByRole('group')).toHaveLength(1);
		expect(screen.getAllByText('view A')).toHaveLength(2);
		fireEvent.click(rowOf('Test same-1').getByRole('button', { name: 'B' }));
		expect(screen.getAllByText('view B')).toHaveLength(2);
		expect(errorSpy).not.toHaveBeenCalled();
	});

	it('refuses a second, different test under the same id: reported with the id, not shown in the dock', () => {
		render(
			<AbExperiments enabled>
				<DslRenderer node={experiment('clash-1', { a: label('first A'), b: label('first B') })} registry={registry} />
				<DslRenderer node={{ ...experiment('clash-1', { x: label('second X'), y: label('second Y') }) }} registry={registry} />
			</AbExperiments>
		);
		expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('"clash-1"'));
		expect(screen.getAllByRole('group')).toHaveLength(1);
		expect(rowOf('Test clash-1').getByRole('button', { name: 'A' })).toBeInTheDocument();
	});

	it('reports a host test and a view test with the same id, and shows the host one', () => {
		function Host() {
			const t = useAbTest({ id: 'host-clash', label: 'Host clash', initial: 'a', options: { a: { label: 'A', hint: 'a' }, b: { label: 'B', hint: 'b' } } });
			return <Page node={experiment('host-clash', { a: label('view A'), b: label('view B') })} tests={[t]} />;
		}
		render(<Host />);
		expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('"host-clash"'));
		expect(screen.getAllByRole('group')).toHaveLength(1);
		expect(screen.getByRole('group', { name: 'Host clash' })).toBeInTheDocument();
	});

	it('drops the row when the node unmounts', () => {
		const { rerender } = render(<Page node={experiment('gone-1', { a: label('view A'), b: label('view B') })} />);
		expect(screen.getByRole('group', { name: 'Test gone-1' })).toBeInTheDocument();
		rerender(<Page node={label('nothing to test')} />);
		expect(screen.queryByRole('group', { name: 'Test gone-1' })).not.toBeInTheDocument();
	});

	it('allows an AbTest inside a variant: its row exists only while that variant is shown', () => {
		const inner = experiment('inner-1', { x: label('inner X'), y: label('inner Y') });
		render(<Page node={experiment('outer-1', { plain: label('plain view'), nested: inner })} />);
		expect(screen.queryByRole('group', { name: 'Test inner-1' })).not.toBeInTheDocument();
		fireEvent.click(rowOf('Test outer-1').getByRole('button', { name: 'NESTED' }));
		expect(screen.getByText('inner X')).toBeInTheDocument();
		fireEvent.click(rowOf('Test inner-1').getByRole('button', { name: 'Y' }));
		expect(screen.getByText('inner Y')).toBeInTheDocument();
		fireEvent.click(rowOf('Test outer-1').getByRole('button', { name: 'PLAIN' }));
		expect(screen.queryByRole('group', { name: 'Test inner-1' })).not.toBeInTheDocument();
	});

	it('follows a change made in another tab', () => {
		render(<Page node={experiment('tab-1', { a: label('view A'), b: label('view B') })} />);
		act(() => {
			localStorage.setItem('ab.tab-1', 'b');
			window.dispatchEvent(new StorageEvent('storage', { key: 'ab.tab-1', newValue: 'b', storageArea: localStorage }));
		});
		expect(screen.getByText('view B')).toBeInTheDocument();
	});
});

describe('AbTest node, experiments off (production safety)', () => {
	it('renders only the initial variant, shows no dock, and never reads the storage or the URL', () => {
		localStorage.setItem('ab.off-1', 'b');
		window.history.pushState({}, '', '/?ab.off-1=b');
		const getItem = vi.spyOn(Storage.prototype, 'getItem');
		render(<Page node={experiment('off-1', { a: label('view A'), b: label('view B') })} enabled={false} />);
		expect(screen.getByText('view A')).toBeInTheDocument();
		expect(screen.queryByTestId('ab-dock')).not.toBeInTheDocument();
		expect(getItem.mock.calls.map(([k]) => k).filter((k) => k.startsWith('ab.off'))).toEqual([]);
		expect(warnSpy).not.toHaveBeenCalled();
	});

	it('does the same without any host outside development, without a warning', () => {
		localStorage.setItem('ab.off-2', 'b');
		render(<DslRenderer node={experiment('off-2', { a: label('view A'), b: label('view B') })} registry={registry} />);
		expect(screen.getByText('view A')).toBeInTheDocument();
		expect(warnSpy).not.toHaveBeenCalled();
	});
});

describe('AbTest node without a host', () => {
	it('in development applies the stored choice and says once that no dock can change it', () => {
		vi.mocked(isDev).mockReturnValue(true);
		localStorage.setItem('ab.nohost-1', 'b');
		const node = experiment('nohost-1', { a: label('view A'), b: label('view B') });
		const { rerender } = render(<DslRenderer node={node} registry={registry} />);
		expect(screen.getByText('view B')).toBeInTheDocument();
		rerender(<DslRenderer node={{ ...node }} registry={registry} />);
		const calls = warnSpy.mock.calls.filter(([m]) => String(m).includes('nohost-1'));
		expect(calls).toHaveLength(1);
		expect(String(calls[0]![0])).toContain('<AbExperiments>');
	});
});

describe('AbTest node, bad declarations are loud', () => {
	const alertOf = () => screen.getByRole('alert');

	it('an initial that is not a variant', () => {
		render(<Page node={experiment('bad-initial', { a: label('A'), b: label('B') }, 'zzz')} />);
		expect(alertOf()).toHaveTextContent('"initial" is "zzz"');
		expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('AbTest "bad-initial"'));
	});

	it('no variants', () => {
		render(<Page node={{ $type: 'AbTest', id: 'bad-empty', label: 'Empty', initial: 'a', variants: {} }} />);
		expect(alertOf()).toHaveTextContent('at least one variant');
		expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('AbTest "bad-empty"'));
	});

	it('a variant without a view', () => {
		render(<Page node={{ $type: 'AbTest', id: 'bad-view', label: 'No view', initial: 'a', variants: { a: { label: 'A', hint: 'a' } } }} />);
		expect(alertOf()).toHaveTextContent('variant "a" needs a "label", a "hint" and a "view"');
	});

	it('an id that cannot name a storage key or a URL parameter', () => {
		render(<Page node={experiment('bad id!', { a: label('A') })} />);
		expect(alertOf()).toHaveTextContent('"id" must be');
	});

	it('mounting the host twice', () => {
		render(
			<AbExperiments enabled>
				<AbExperiments enabled>
					<DslRenderer node={experiment('twice-1', { a: label('A'), b: label('B') })} registry={registry} />
				</AbExperiments>
			</AbExperiments>
		);
		expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('inside another AbExperiments'));
		expect(screen.getAllByTestId('ab-dock')).toHaveLength(1);
	});
});

describe('AbTest node, every malformed declaration is refused with its own message', () => {
	const view = label('A');
	const good = { a: variant('A', view) };
	// One id per case: a message is logged once per page, so cases sharing an id and a message would hide each other.
	const declared = (id: string, patch: Record<string, unknown>) => ({ $type: 'AbTest', id, label: 'Bad decl', initial: 'a', variants: good, ...patch });

	it.each([
		['an empty label', { label: '' }, '"label" must be a non-empty string'],
		['a label that is not text', { label: 42 }, '"label" must be a non-empty string'],
		['no variants at all', { variants: undefined }, '"variants" must be a map'],
		['variants as a list', { variants: [variant('A', view)] }, '"variants" must be a map'],
		['variants that are not an object', { variants: 'a' }, '"variants" must be a map'],
		['a variant that is empty', { variants: { a: null } }, 'variant "a" needs'],
		['a variant that is not an object', { variants: { a: 'A' } }, 'variant "a" needs'],
		['a variant label that is not text', { variants: { a: { label: 1, hint: 'h', view } } }, 'variant "a" needs'],
		['a variant without a hint', { variants: { a: { label: 'A', view } } }, 'variant "a" needs'],
		['a variant hint that is not text', { variants: { a: { label: 'A', hint: 1, view } } }, 'variant "a" needs'],
	])('%s', (name, patch, message) => {
		const id = `bad-${name.replace(/[^A-Za-z0-9]+/g, '-')}`;
		render(<Page node={declared(id, patch)} />);
		expect(screen.getByRole('alert')).toHaveTextContent(message);
		expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining(`AbTest "${id}"`));
	});

	it('accepts a variant label that is an empty string (it is only text)', () => {
		render(<Page node={declared('empty-variant-label', { variants: { a: { label: '', hint: 'h', view } } })} />);
		expect(screen.queryByRole('alert')).toBeNull();
	});
});

describe('AbTest node and the dock', () => {
	// Reads what the host store holds, as a list of ids.
	function StoreIds() {
		const host = useAbExperiments()!;
		const tests = useSyncExternalStore(host.store.subscribe, host.store.getSnapshot);
		return <output data-testid="store-ids">{tests.map((t) => t.id).join(',')}</output>;
	}
	const withStore = (node: Record<string, unknown>, enabled = true) => (
		<AbExperiments enabled={enabled}>
			<DslRenderer node={node} registry={registry} />
			<StoreIds />
		</AbExperiments>
	);

	it('registers a valid test while experiments are on', () => {
		render(withStore(experiment('store-ok', { a: label('A'), b: label('B') })));
		expect(screen.getByTestId('store-ids')).toHaveTextContent('store-ok');
	});

	it('registers nothing for a bad declaration', () => {
		render(withStore(experiment('store-bad', { a: label('A') }, 'zzz')));
		expect(screen.getByTestId('store-ids')).toBeEmptyDOMElement();
		expect(screen.queryByTestId('ab-dock')).not.toBeInTheDocument();
	});

	it('registers nothing while experiments are off, and renders the initial variant', () => {
		render(withStore(experiment('store-off', { a: label('view A'), b: label('view B') }), false));
		expect(screen.getByTestId('store-ids')).toBeEmptyDOMElement();
		expect(screen.getByText('view A')).toBeInTheDocument();
	});

	it('drops the row when the declaration becomes bad', () => {
		const { rerender } = render(withStore(experiment('store-turns-bad', { a: label('A'), b: label('B') })));
		expect(screen.getByTestId('store-ids')).toHaveTextContent('store-turns-bad');
		rerender(withStore(experiment('store-turns-bad', { a: label('A'), b: label('B') }, 'zzz')));
		expect(screen.getByTestId('store-ids')).toBeEmptyDOMElement();
		expect(screen.queryByTestId('ab-dock')).not.toBeInTheDocument();
	});

	it('reports a clash between a host test and a view test only once, even if the page is mounted again', () => {
		function Host() {
			const t = useAbTest({ id: 'clash-twice', label: 'Clash twice', initial: 'a', options: { a: { label: 'A', hint: 'a' }, b: { label: 'B', hint: 'b' } } });
			return <Page node={experiment('clash-twice', { a: label('view A'), b: label('view B') })} tests={[t]} />;
		}
		const first = render(<Host />);
		first.unmount();
		render(<Host />);
		const clashes = errorSpy.mock.calls.filter(([m]) => String(m).includes('"clash-twice"'));
		expect(clashes).toHaveLength(1);
	});
});
