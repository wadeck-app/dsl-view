import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { UrlParamContext } from '@dsl-ui/context/UrlParamContext.js';
import type { UrlParamService } from '@dsl-ui/context/UrlParamContext.js';
import { PageSizeSelect } from './PageSizeSelect.js';

function service(params: Record<string, string> = {}) {
	const set = vi.fn();
	const svc: UrlParamService = { get: key => params[key] ?? null, set };
	return { svc, set };
}

function renderUrlBacked(params: Record<string, string>, props: Partial<React.ComponentProps<typeof PageSizeSelect>> = {}) {
	const { svc, set } = service(params);
	render(
		<UrlParamContext.Provider value={svc}>
			<PageSizeSelect urlParam="size" options={[10, 25, 50]} {...props} />
		</UrlParamContext.Provider>
	);
	return { set, select: screen.getByRole('combobox', { name: 'Page size' }) as HTMLSelectElement };
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('PageSizeSelect', () => {
	it('renders one "N / page" option per size', () => {
		render(<PageSizeSelect options={[10, 25]} value={25} onChange={() => {}} />);
		expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual(['10 / page', '25 / page']);
	});

	describe('controlled', () => {
		it('shows the value prop and reports a change as a number', () => {
			const onChange = vi.fn();
			render(<PageSizeSelect options={[10, 25, 50]} value={25} onChange={onChange} />);
			const select = screen.getByRole('combobox', { name: 'Page size' }) as HTMLSelectElement;
			expect(select.value).toBe('25');
			fireEvent.change(select, { target: { value: '50' } });
			expect(onChange).toHaveBeenCalledExactlyOnceWith(50);
		});

		it('falls back to the first option without a value', () => {
			render(<PageSizeSelect options={[10, 25]} onChange={() => {}} />);
			expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('10');
		});

		it('does not throw when changed without an onChange handler', () => {
			render(<PageSizeSelect options={[10, 25]} value={10} />);
			expect(() => fireEvent.change(screen.getByRole('combobox'), { target: { value: '25' } })).not.toThrow();
		});

		it('ignores the url when urlParam is not set, even inside a UrlParamContext', () => {
			const { svc, set } = service({ size: '50' });
			render(
				<UrlParamContext.Provider value={svc}>
					<PageSizeSelect options={[10, 25, 50]} value={10} onChange={() => {}} />
				</UrlParamContext.Provider>
			);
			expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('10');
			expect(set).not.toHaveBeenCalled();
		});
	});

	describe('url-backed', () => {
		it('reads the size from the url param and ignores the value prop', () => {
			const { select } = renderUrlBacked({ size: '50' }, { value: 10 });
			expect(select.value).toBe('50');
		});

		it('defaults to the first option when the param is absent', () => {
			const { select } = renderUrlBacked({});
			expect(select.value).toBe('10');
		});

		it('writes the new size as a string, softly, and ignores onChange', () => {
			const onChange = vi.fn();
			const { select, set } = renderUrlBacked({ size: '10' }, { onChange });
			fireEvent.change(select, { target: { value: '25' } });
			expect(set).toHaveBeenCalledExactlyOnceWith('size', '25', { replace: true });
			expect(onChange).not.toHaveBeenCalled();
		});

		it('also deletes the resetUrlParams keys in the same update', () => {
			const { select, set } = renderUrlBacked({ size: '10' }, { resetUrlParams: ['page'] });
			fireEvent.change(select, { target: { value: '25' } });
			expect(set).toHaveBeenCalledExactlyOnceWith('size', '25', { replace: true, remove: ['page'] });
		});

		it('warns once, naming the param, the value and the offered sizes, when the url size is not offered', () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const { svc } = service({ size: '7' });
			const view = render(
				<UrlParamContext.Provider value={svc}>
					<PageSizeSelect urlParam="size" options={[10, 25, 50]} />
				</UrlParamContext.Provider>
			);
			view.rerender(
				<UrlParamContext.Provider value={svc}>
					<PageSizeSelect urlParam="size" options={[10, 25, 50]} />
				</UrlParamContext.Provider>
			);
			expect(warn).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('?size=7 is not one of the offered sizes (10, 25, 50)'));
		});

		it('does not warn for an offered size or an absent param', () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			renderUrlBacked({ size: '25' });
			cleanup();
			renderUrlBacked({});
			expect(warn).not.toHaveBeenCalled();
		});

		it('does not warn in controlled mode', () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			render(<PageSizeSelect options={[10, 25]} value={7} onChange={() => {}} />);
			expect(warn).not.toHaveBeenCalled();
		});
	});
});

describe('PageSizeSelect default', () => {
	it('shows the default instead of the first option when nothing is selected (controlled)', () => {
		render(<PageSizeSelect options={[10, 25, 50]} default={50} onChange={() => {}} />);
		expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('50');
	});

	it('lets an explicit value win over the default (controlled)', () => {
		render(<PageSizeSelect options={[10, 25, 50]} value={25} default={50} onChange={() => {}} />);
		expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('25');
	});

	it('fills an absent URL param with the default, once, with the url mode setter', () => {
		const { set, select } = renderUrlBacked({}, { default: 50 });
		expect(select.value).toBe('50');
		expect(set).toHaveBeenCalledExactlyOnceWith('size', '50', { replace: true });
	});

	it('leaves a URL param that is present alone, even when it differs from the default', () => {
		const { set, select } = renderUrlBacked({ size: '25' }, { default: 50 });
		expect(select.value).toBe('25');
		expect(set).not.toHaveBeenCalled();
	});

	it('does not touch the URL without a default', () => {
		const { set, select } = renderUrlBacked({});
		expect(select.value).toBe('10');
		expect(set).not.toHaveBeenCalled();
	});

	it('reports a default that is not one of the options, ignores it and writes nothing', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const { set, select } = renderUrlBacked({}, { default: 40 });
		expect(select.value).toBe('10');
		expect(set).not.toHaveBeenCalled();
		const reported = [...warn.mock.calls, ...error.mock.calls].map(call => String(call[0]));
		expect(reported.some(message => message.includes('[PageSizeSelect] default 40 is not one of the offered sizes (10, 25, 50) and is ignored.'))).toBe(true);
	});
});
