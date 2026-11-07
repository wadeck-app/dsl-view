import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CompactSelect } from './CompactSelect.js';

import { createMemoryRouter, RouterProvider as ReactRouterProvider } from 'react-router-dom';
import { UrlParamContext } from '@dsl-ui/context/UrlParamContext.js';
import type { UrlParamService } from '@dsl-ui/context/UrlParamContext.js';
import { RouterProvider } from '../navigation/RouterProvider.js';

/*
 * The gap this fills: a toolbar needs a select with no visible label, and neither existing one fits.
 * PageSizeSelect is compact and label-less but its options are numbers rendered as "N / page", locked
 * to pagination. FieldSelect takes generic options but goes through FieldWrapper, so it renders a
 * visible label and a full-width control -- wrong shape for a row of controls. Consumers therefore
 * reached for a raw <select>, which is how the orchestrator's log run selector ended up unstyled and
 * unlabelled.
 */

const OPTIONS = [
	{ value: 'a', label: 'Run A' },
	{ value: 'b', label: 'Run B' },
];

describe('rendering', () => {
	it('renders the options with their labels', () => {
		render(<CompactSelect value="a" options={OPTIONS} onChange={() => {}} ariaLabel="Run" />);
		expect(screen.getByRole('option', { name: 'Run A' })).toBeInTheDocument();
		expect(screen.getByRole('option', { name: 'Run B' })).toBeInTheDocument();
	});

	it('shows the current value as selected', () => {
		render(<CompactSelect value="b" options={OPTIONS} onChange={() => {}} ariaLabel="Run" />);
		expect(screen.getByRole('combobox')).toHaveValue('b');
	});

	/*
	 * The whole point of the component is that there is no visible label, so the accessible name has to
	 * come from somewhere. ariaLabel is a required prop for that reason -- an unnamed control is the
	 * exact defect that made three shipped date fields announce nothing.
	 */
	it('is named by ariaLabel, since it has no visible label', () => {
		render(<CompactSelect value="a" options={OPTIONS} onChange={() => {}} ariaLabel="Which run" />);
		expect(screen.getByLabelText('Which run')).toBeInTheDocument();
		expect(screen.getByRole('combobox')).toHaveAttribute('aria-label', 'Which run');
	});

	// Not `aria-label`: the entries generator skips aria-* props, so a DSL page could not set it.
	it('exposes it as a plain prop a DSL page can set', () => {
		render(<CompactSelect value="a" options={OPTIONS} onChange={() => {}} ariaLabel="Set from YAML" />);
		expect(screen.getByLabelText('Set from YAML')).toBeInTheDocument();
	});

	it('renders no visible label text', () => {
		const { container } = render(
			<CompactSelect value="a" options={OPTIONS} onChange={() => {}} ariaLabel="Which run" />,
		);
		expect(container.querySelector('label')).toBeNull();
	});

	it('takes a placeholder for the empty choice', () => {
		render(<CompactSelect value="" options={OPTIONS} onChange={() => {}} ariaLabel="Run" placeholder="All runs" />);
		expect(screen.getByRole('option', { name: 'All runs' })).toHaveValue('');
	});

	it('without a placeholder there is no empty option to pick by accident', () => {
		render(<CompactSelect value="a" options={OPTIONS} onChange={() => {}} ariaLabel="Run" />);
		expect(screen.getAllByRole('option')).toHaveLength(2);
	});

	it('can be disabled', () => {
		render(<CompactSelect value="a" options={OPTIONS} onChange={() => {}} ariaLabel="Run" disabled />);
		expect(screen.getByRole('combobox')).toBeDisabled();
	});

	it('an empty option list still renders a usable control', () => {
		render(<CompactSelect value="" options={[]} onChange={() => {}} ariaLabel="Run" />);
		expect(screen.getByRole('combobox')).toBeInTheDocument();
	});
});

describe('onChange', () => {
	it('reports the chosen value, not the event', () => {
		const onChange = vi.fn();
		render(<CompactSelect value="a" options={OPTIONS} onChange={onChange} ariaLabel="Run" />);

		fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } });

		expect(onChange).toHaveBeenCalledWith('b');
	});

	it('reports the empty value when the placeholder is chosen', () => {
		const onChange = vi.fn();
		render(<CompactSelect value="a" options={OPTIONS} onChange={onChange} ariaLabel="Run" placeholder="All runs" />);

		fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });

		expect(onChange).toHaveBeenCalledWith('');
	});
});

describe('shape', () => {
	// A toolbar puts controls in a row, so this must size to its content rather than fill the row the
	// way FieldSelect's w-full does.
	it('does not stretch to full width', () => {
		render(<CompactSelect value="a" options={OPTIONS} onChange={() => {}} ariaLabel="Run" />);
		expect(screen.getByRole('combobox').className).not.toMatch(/\bw-full\b/);
	});
});

// URL-backed cases run through the real RouterProvider, like table/urlParamReset.test.tsx: the URL update is real.
function renderAt(url: string, element: React.ReactElement) {
	const router = createMemoryRouter([{ path: '/p', element: <RouterProvider>{element}</RouterProvider> }], {
		initialEntries: [url],
	});
	const updates: Array<{ search: string; action: string }> = [];
	router.subscribe(state => updates.push({ search: state.location.search, action: state.historyAction }));
	render(<ReactRouterProvider router={router} />);
	return { router, updates };
}

const RANGES = [
	{ value: '1M', label: '1 month' },
	{ value: '6M', label: '6 months' },
	{ value: '1Y', label: '1 year' },
];

describe('defaultValue', () => {
	it('is shown instead of the first option while the url param is absent', () => {
		renderAt('/p', <CompactSelect urlParam="range" defaultValue="6M" value="" options={RANGES} onChange={() => {}} ariaLabel="Period" />);
		expect(screen.getByRole('combobox', { name: 'Period' })).toHaveValue('6M');
	});

	// Left side of `??`: a present param is the user's choice, whatever the default says.
	it('loses to the url value', () => {
		renderAt('/p?range=1Y', <CompactSelect urlParam="range" defaultValue="6M" value="" options={RANGES} onChange={() => {}} ariaLabel="Period" />);
		expect(screen.getByRole('combobox', { name: 'Period' })).toHaveValue('1Y');
	});

	// `''` is not `null`: `?range=` is what picking the placeholder writes, so it must not snap back to the default.
	it('does not replace an empty url param, which is the placeholder choice', () => {
		renderAt('/p?range=', <CompactSelect urlParam="range" defaultValue="6M" value="" options={RANGES} onChange={() => {}} ariaLabel="Period" placeholder="Any period" />);
		const select = screen.getByRole('combobox', { name: 'Period' });
		expect(select).toHaveValue('');
		expect(screen.getByRole('option', { name: 'Any period' })).toHaveProperty('selected', true);
	});

	// No option can represent the empty text without a placeholder, so `?range=` is not a choice there: it is read as absent.
	it('without a placeholder, an empty url param is not a choice and the default is shown', () => {
		const { router, updates } = renderAt('/p?range=', <CompactSelect urlParam="range" defaultValue="6M" value="" options={RANGES} onChange={() => {}} ariaLabel="Period" />);
		expect(screen.getByRole('combobox', { name: 'Period' })).toHaveValue('6M');
		expect(screen.queryByRole('option', { name: /^Unknown/ })).toBeNull();
		expect(router.state.location.search).toBe('?range=');
		expect(updates).toHaveLength(0);
	});

	it('without a placeholder and without a default, an empty url param keeps the native first-option display', () => {
		const { updates } = renderAt('/p?range=', <CompactSelect urlParam="range" value="" options={RANGES} onChange={() => {}} ariaLabel="Period" />);
		expect(screen.getByRole('combobox', { name: 'Period' })).toHaveValue('1M');
		expect(screen.getAllByRole('option')).toHaveLength(RANGES.length);
		expect(updates).toHaveLength(0);
	});

	// Right side of `??`: without a default the absent param is still '' (the placeholder), as before the prop existed.
	it('without it an absent url param still shows the placeholder', () => {
		renderAt('/p', <CompactSelect urlParam="range" value="" options={RANGES} onChange={() => {}} ariaLabel="Period" placeholder="Any period" />);
		expect(screen.getByRole('combobox', { name: 'Period' })).toHaveValue('');
	});

	it('wins over the placeholder while the url param is absent', () => {
		renderAt('/p', <CompactSelect urlParam="range" defaultValue="6M" value="" options={RANGES} onChange={() => {}} ariaLabel="Period" placeholder="Any period" />);
		expect(screen.getByRole('combobox', { name: 'Period' })).toHaveValue('6M');
	});

	// PageSizeSelect fills the URL with its `default`; this one only displays it, so a source reading `$urlParam.range`
	// still sees "absent" and applies its own default.
	it('does not write the url on mount', () => {
		const { router, updates } = renderAt('/p?keep=1', <CompactSelect urlParam="range" defaultValue="6M" value="" options={RANGES} onChange={() => {}} ariaLabel="Period" />);
		expect(router.state.location.search).toBe('?keep=1');
		expect(updates).toHaveLength(0);
	});

	it('does not call the service setter on mount', () => {
		const set = vi.fn();
		const service: UrlParamService = { get: () => null, set };
		render(
			<UrlParamContext.Provider value={service}>
				<CompactSelect urlParam="range" defaultValue="6M" value="" options={RANGES} onChange={() => {}} ariaLabel="Period" />
			</UrlParamContext.Provider>
		);
		expect(set).not.toHaveBeenCalled();
	});

	// The default belongs to the url-backed mode; the caller's own `value` is what a controlled select shows.
	it('is ignored without urlParam', () => {
		render(<CompactSelect value="1Y" defaultValue="6M" options={RANGES} onChange={() => {}} ariaLabel="Period" />);
		expect(screen.getByRole('combobox', { name: 'Period' })).toHaveValue('1Y');
	});

	it('keeps the accessible name', () => {
		renderAt('/p', <CompactSelect urlParam="range" defaultValue="6M" value="" options={RANGES} onChange={() => {}} ariaLabel="Period" />);
		expect(screen.getByLabelText('Period')).toHaveValue('6M');
	});

	it('picking an option writes it, keeps the other params and replaces the history entry', () => {
		const { router, updates } = renderAt('/p?keep=1&page=3', <CompactSelect urlParam="range" defaultValue="6M" value="" options={RANGES} onChange={() => {}} ariaLabel="Period" />);

		fireEvent.change(screen.getByRole('combobox', { name: 'Period' }), { target: { value: '1Y' } });

		const params = new URLSearchParams(router.state.location.search);
		expect(params.get('range')).toBe('1Y');
		expect(params.get('keep')).toBe('1');
		expect(params.get('page')).toBe('3');
		expect(updates).toHaveLength(1);
		expect(updates[0]!.action).toBe('REPLACE');
		expect(screen.getByRole('combobox', { name: 'Period' })).toHaveValue('1Y');
	});

	it('picking the placeholder writes the empty value and the default does not come back', () => {
		const { router } = renderAt('/p', <CompactSelect urlParam="range" defaultValue="6M" value="" options={RANGES} onChange={() => {}} ariaLabel="Period" placeholder="Any period" />);

		fireEvent.change(screen.getByRole('combobox', { name: 'Period' }), { target: { value: '' } });

		expect(new URLSearchParams(router.state.location.search).get('range')).toBe('');
		expect(screen.getByRole('combobox', { name: 'Period' })).toHaveValue('');
	});
});

describe('a value no option carries', () => {
	it('is shown as a disabled "Unknown: <value>" option instead of silently displaying the first option', () => {
		renderAt('/p?range=2Y', <CompactSelect urlParam="range" value="" options={RANGES} onChange={() => {}} ariaLabel="Period" />);

		const select = screen.getByRole('combobox', { name: 'Period' });
		const unknown = screen.getByRole('option', { name: 'Unknown: 2Y' });
		expect(unknown).toBeDisabled();
		expect(unknown).toHaveProperty('selected', true);
		expect(select).toHaveValue('2Y');
		// The real options are all still offered.
		expect(screen.getAllByRole('option')).toHaveLength(RANGES.length + 1);
	});

	it('goes away once a real option is picked', () => {
		renderAt('/p?range=2Y', <CompactSelect urlParam="range" value="" options={RANGES} onChange={() => {}} ariaLabel="Period" />);

		fireEvent.change(screen.getByRole('combobox', { name: 'Period' }), { target: { value: '1M' } });

		expect(screen.queryByRole('option', { name: /^Unknown/ })).toBeNull();
		expect(screen.getByRole('combobox', { name: 'Period' })).toHaveValue('1M');
	});

	it('is not added for a value an option carries', () => {
		renderAt('/p?range=1Y', <CompactSelect urlParam="range" value="" options={RANGES} onChange={() => {}} ariaLabel="Period" />);
		expect(screen.getAllByRole('option')).toHaveLength(RANGES.length);
	});

	// '' means "nothing chosen": without a placeholder the select keeps showing its first option, as it always did.
	it('is not added for the empty value, with or without a placeholder', () => {
		const { unmount } = render(<CompactSelect value="" options={OPTIONS} onChange={() => {}} ariaLabel="Run" />);
		expect(screen.getAllByRole('option')).toHaveLength(OPTIONS.length);
		unmount();

		render(<CompactSelect value="" options={OPTIONS} onChange={() => {}} ariaLabel="Run" placeholder="All runs" />);
		expect(screen.getAllByRole('option')).toHaveLength(OPTIONS.length + 1);
	});

	// Existing hosts pass `value` themselves (options often load later): their display must not change under them.
	it('is not added for a controlled value, which keeps the native display it always had', () => {
		render(<CompactSelect value="gone" options={OPTIONS} onChange={() => {}} ariaLabel="Run" />);
		expect(screen.queryByRole('option', { name: /^Unknown/ })).toBeNull();
		expect(screen.getAllByRole('option')).toHaveLength(OPTIONS.length);
	});

	it('comes after the placeholder, which stays the first option', () => {
		renderAt('/p?run=gone', <CompactSelect urlParam="run" value="" options={OPTIONS} onChange={() => {}} ariaLabel="Run" placeholder="All runs" />);
		expect(screen.getAllByRole('option').map(o => o.textContent)).toStrictEqual(['All runs', 'Unknown: gone', 'Run A', 'Run B']);
	});

	// A link can carry any text; it is rendered as text, never as markup.
	it('renders the value as text', () => {
		renderAt('/p?run=' + encodeURIComponent('<b>x</b>'), <CompactSelect urlParam="run" value="" options={OPTIONS} onChange={() => {}} ariaLabel="Run" />);
		expect(screen.getByRole('option', { name: 'Unknown: <b>x</b>' })).toBeInTheDocument();
	});

	it('is chosen by the defaultValue too when the default is not an option', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		renderAt('/p', <CompactSelect urlParam="range" defaultValue="3M" value="" options={RANGES} onChange={() => {}} ariaLabel="Period" />);

		expect(screen.getByRole('option', { name: 'Unknown: 3M' })).toHaveProperty('selected', true);
		expect(warn).toHaveBeenCalledTimes(1);
	});
});

describe('defaultValue that is not one of the options', () => {
	// Message AND what continues: the report names component, prop and the accepted values, the control still renders.
	it('reports it once, names the accepted values and still renders', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const props = { urlParam: 'range', defaultValue: '3M', value: '', options: RANGES, onChange: () => {}, ariaLabel: 'Period' };
		const view = renderAt('/p', <CompactSelect {...props} />);

		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledWith('[CompactSelect] defaultValue "3M" is not one of the option values (1M, 6M, 1Y).');
		expect(screen.getByRole('combobox', { name: 'Period' })).toBeInTheDocument();

		// A second render of the same mistake does not repeat the report.
		fireEvent.change(screen.getByRole('combobox', { name: 'Period' }), { target: { value: '1M' } });
		expect(view.router.state.location.search).toBe('?range=1M');
		expect(warn).toHaveBeenCalledTimes(1);
	});

	it('does not report a default that is one of the options', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		renderAt('/p', <CompactSelect urlParam="range" defaultValue="6M" value="" options={RANGES} onChange={() => {}} ariaLabel="Period" />);
		expect(warn).not.toHaveBeenCalled();
	});

	it('reports it without urlParam as well, since the mistake is in what the author wrote', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		render(<CompactSelect value="a" defaultValue="zz" options={OPTIONS} onChange={() => {}} ariaLabel="Run" />);
		expect(warn).toHaveBeenCalledTimes(1);
	});

	// '' is an option only when a placeholder provides it.
	it('accepts the empty default when a placeholder provides the empty option', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		renderAt('/p', <CompactSelect urlParam="range" defaultValue="" value="" options={RANGES} onChange={() => {}} ariaLabel="Period" placeholder="Any period" />);
		expect(warn).not.toHaveBeenCalled();
		expect(screen.getByRole('combobox', { name: 'Period' })).toHaveValue('');
	});

	it('reports the empty default when there is no placeholder, and adds no "Unknown: " option', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		renderAt('/p', <CompactSelect urlParam="range" defaultValue="" value="" options={RANGES} onChange={() => {}} ariaLabel="Period" />);
		expect(warn).toHaveBeenCalledTimes(1);
		// Nothing chosen keeps the display it always had: no "Unknown: " option.
		expect(screen.getAllByRole('option')).toHaveLength(RANGES.length);
	});

	it('is silent in a production build and still renders', () => {
		vi.stubEnv('NODE_ENV', 'production');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		renderAt('/p', <CompactSelect urlParam="range" defaultValue="3M" value="" options={RANGES} onChange={() => {}} ariaLabel="Period" />);
		expect(warn).not.toHaveBeenCalled();
		expect(screen.getByRole('option', { name: 'Unknown: 3M' })).toBeInTheDocument();
	});
});

// A page can hand the prop whatever a YAML value or a source field holds (the generated entry normally filters it,
// a React caller does not). It must never crash and never show a nonsense choice.
describe('defaultValue with odd input', () => {
	it.each([
		['undefined', undefined],
		['null', null],
	])('%s means no default: no report, the display is unchanged', (_label, odd) => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		renderAt('/p', <CompactSelect urlParam="range" defaultValue={odd as unknown as string} value="" options={RANGES} onChange={() => {}} ariaLabel="Period" placeholder="Any period" />);
		expect(warn).not.toHaveBeenCalled();
		expect(screen.getByRole('combobox', { name: 'Period' })).toHaveValue('');
	});

	it.each([
		['a number', 42],
		['zero', 0],
		['false', false],
		['true', true],
		['an object', {}],
		['a list', ['6M']],
	])('%s is ignored with one report and does not render', (_label, odd) => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		renderAt('/p', <CompactSelect urlParam="range" defaultValue={odd as unknown as string} value="" options={RANGES} onChange={() => {}} ariaLabel="Period" placeholder="Any period" />);

		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]![0]).toContain('is ignored: it must be a text');
		// Ignored means the placeholder shows and no "Unknown:" option appears for the odd value.
		expect(screen.getByRole('combobox', { name: 'Period' })).toHaveValue('');
		expect(screen.getAllByRole('option')).toHaveLength(RANGES.length + 1);
	});

	it('a circular object does not break the report', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const circular: Record<string, unknown> = {};
		circular['self'] = circular;
		expect(() =>
			renderAt('/p', <CompactSelect urlParam="range" defaultValue={circular as unknown as string} value="" options={RANGES} onChange={() => {}} ariaLabel="Period" />)
		).not.toThrow();
	});

	it('an empty options list with a default still renders and reports', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		renderAt('/p', <CompactSelect urlParam="range" defaultValue="6M" value="" options={[]} onChange={() => {}} ariaLabel="Period" />);
		expect(warn).toHaveBeenCalledTimes(1);
		expect(screen.getByRole('option', { name: 'Unknown: 6M' })).toBeInTheDocument();
	});
});
