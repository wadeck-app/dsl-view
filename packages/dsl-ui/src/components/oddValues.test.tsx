import { fireEvent, render, screen } from '@testing-library/react';
import { Rocket } from 'lucide-react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PageSizeSelect } from './controls/PageSizeSelect.js';
import { PageHeader } from './display/PageHeader.js';
import { FieldAutocomplete } from './form/FieldAutocomplete.js';
import { SearchBar } from './table/SearchBar.js';

// What a YAML author or a half-loaded source can hand to a prop (see registry.robustness.test.tsx for the sweep that
// found these): each case below crashed the whole page before. The component must degrade, say why once, and keep
// everything else it renders.
let warn: ReturnType<typeof vi.spyOn>;
let error: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
	warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
	error = vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('PageHeader icon', () => {
	it('shows a Lucide component passed from TSX', () => {
		const { container } = render(<PageHeader title="Jobs" icon={Rocket} />);
		expect(screen.getByRole('heading', { name: 'Jobs' })).toBeInTheDocument();
		expect(container.querySelector('svg')).not.toBeNull();
		expect(error).not.toHaveBeenCalled();
	});

	it('shows the icon a YAML node names', () => {
		const { container } = render(<PageHeader title="Jobs" icon="rocket" />);
		expect(screen.getByRole('heading', { name: 'Jobs' })).toBeInTheDocument();
		expect(container.querySelector('svg')).not.toBeNull();
		expect(error).not.toHaveBeenCalled();
	});

	it('shows no icon for an unknown name, keeps the title, and lists the supported names once', () => {
		const { container } = render(<PageHeader title="Jobs" icon={"no-such-icon" as never} />);
		expect(screen.getByRole('heading', { name: 'Jobs' })).toBeInTheDocument();
		expect(container.querySelector('svg')).toBeNull();
		expect(error).toHaveBeenCalledTimes(1);
		expect(String(error.mock.calls[0]?.[0])).toMatch(/^\[PageHeader\.icon\] unknown icon "no-such-icon": no icon is shown\. Supported icons: .*rocket/);
	});

	it.each([
		['a map', {}, 'a map'],
		['a list', [], 'a list'],
		['a number', 42, 'number'],
		['false', false, 'boolean'],
	])('ignores %s, keeps the title and names what it received', (_label, icon, received) => {
		const { container } = render(<PageHeader title="Jobs" subtitle="sub" icon={icon as never} />);
		expect(screen.getByRole('heading', { name: 'Jobs' })).toBeInTheDocument();
		expect(container.querySelector('svg')).toBeNull();
		expect(error).toHaveBeenCalledWith(`[PageHeader] icon expects an icon name or an icon component but received ${received}: no icon is shown.`);
	});

	it('treats an empty or null icon as no icon, quietly', () => {
		render(<PageHeader title="A" icon={'' as never} />);
		render(<PageHeader title="B" icon={null as never} />);
		expect(error).not.toHaveBeenCalled();
	});
});

describe('SearchBar size', () => {
	it.each([['large'], ['']])('uses the default (md) geometry for the unknown size %j and lists the allowed ones', (size) => {
		render(<SearchBar value="" onChange={() => {}} size={size as never} />);
		expect(screen.getByRole('searchbox')).toHaveClass('px-2', 'py-1.5', 'pl-7', 'text-sm');
		expect(warn).toHaveBeenCalledTimes(1);
		expect(String(warn.mock.calls[0]?.[0])).toContain(size === '' ? 'unknown size ""' : 'unknown size "large"');
		expect(String(warn.mock.calls[0]?.[0])).toContain('Allowed values: md, sm');
	});
});

describe('FieldAutocomplete options', () => {
	it('shows the usable options and ignores entries without a text label, reporting how many', () => {
		const options = [{}, { value: 'fr', label: 'France' }, null, { value: 'de', label: 'Germany' }] as unknown as Array<{ value: string; label: string }>;
		render(<FieldAutocomplete label="Country" options={options} value="" onChange={vi.fn()} />);
		const input = screen.getByRole('combobox');
		fireEvent.focus(input);
		fireEvent.change(input, { target: { value: 'ger' } });
		expect(screen.getAllByRole('option').map((o) => o.textContent)).toStrictEqual(['Germany']);
		expect(warn).toHaveBeenCalledExactlyOnceWith('[FieldAutocomplete.options] 2 of 4 option(s) have no text label and are left out: write each option as { value, label }.');
	});
});

describe('PageSizeSelect options', () => {
	it('offers the numeric sizes, converts numeric text, and leaves out the rest with one report', () => {
		render(<PageSizeSelect options={[10, {}, '25', 'many', NaN, 50] as unknown as number[]} value={25} onChange={() => {}} />);
		expect(screen.getAllByRole('option').map((o) => o.textContent)).toStrictEqual(['10 / page', '25 / page', '50 / page']);
		expect(screen.getByRole('combobox', { name: 'Page size' })).toHaveValue('25');
		expect(warn).toHaveBeenCalledExactlyOnceWith('[PageSizeSelect] 3 of 6 option(s) are not numbers and are left out: write the page sizes as numbers, e.g. [10, 25, 50].');
	});
});
