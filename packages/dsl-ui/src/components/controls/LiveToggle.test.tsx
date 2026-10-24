import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UrlParamContext } from '../../context/UrlParamContext.js';
import type { UrlParamService } from '../../context/UrlParamContext.js';
import { LiveToggle } from './LiveToggle.js';

describe('LiveToggle', () => {
	it('when live: reads "live", is pressed, and offers to pause', () => {
		render(<LiveToggle live onChange={vi.fn()} />);

		const toggle = screen.getByRole('button', { name: 'live' });
		expect(toggle).toHaveAttribute('aria-pressed', 'true');
		expect(toggle).toHaveAttribute('title', 'Pause live refresh');
	});

	it('when paused: reads "paused", is not pressed, and offers to start', () => {
		render(<LiveToggle live={false} onChange={vi.fn()} />);

		const toggle = screen.getByRole('button', { name: 'paused' });
		expect(toggle).toHaveAttribute('aria-pressed', 'false');
		expect(toggle).toHaveAttribute('title', 'Start live refresh');
	});

	it('clicking asks for the opposite state, from both states', () => {
		const onChange = vi.fn();
		const { rerender } = render(<LiveToggle live onChange={onChange} />);

		fireEvent.click(screen.getByRole('button'));
		expect(onChange).toHaveBeenLastCalledWith(false);

		rerender(<LiveToggle live={false} onChange={onChange} />);
		fireEvent.click(screen.getByRole('button'));
		expect(onChange).toHaveBeenLastCalledWith(true);
		expect(onChange).toHaveBeenCalledTimes(2);
	});

	it('is a plain button, so it never submits a form it sits in', () => {
		render(<LiveToggle live onChange={vi.fn()} />);

		expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
	});
});

// A source's `pollWhen: $urlParam.live` reads the same query param: the toggle is its switch.
describe('LiveToggle urlParam mode', () => {
	function serviceWith(initial: Record<string, string>) {
		const store = new Map(Object.entries(initial));
		const set = vi.fn((key: string, value: string) => {
			store.set(key, value);
		});
		const service: UrlParamService = { get: key => store.get(key) ?? null, set };
		return { service, set };
	}

	it.each([
		['true', true],
		['1', true],
		['yes', true],
		['', false],
		['0', false],
		['false', false],
	])('reads the param value %j as %s', (value, expected) => {
		const { service } = serviceWith({ live: value });
		render(
			<UrlParamContext.Provider value={service}>
				<LiveToggle urlParam="live" live={!expected} onChange={vi.fn()} />
			</UrlParamContext.Provider>
		);
		expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', String(expected));
	});

	it('is off while the param is absent', () => {
		const { service } = serviceWith({});
		render(
			<UrlParamContext.Provider value={service}>
				<LiveToggle urlParam="live" />
			</UrlParamContext.Provider>
		);
		expect(screen.getByRole('button', { name: 'paused' })).toHaveAttribute('aria-pressed', 'false');
	});

	it('writes true when turned on and false when turned off, with replace, and never calls onChange', () => {
		const { service, set } = serviceWith({});
		const onChange = vi.fn();
		const { rerender } = render(
			<UrlParamContext.Provider value={service}>
				<LiveToggle urlParam="live" onChange={onChange} />
			</UrlParamContext.Provider>
		);
		fireEvent.click(screen.getByRole('button'));
		expect(set).toHaveBeenLastCalledWith('live', 'true', { replace: true });

		// The URL now says true: the next render reads it, and a click turns it off.
		rerender(
			<UrlParamContext.Provider value={{ ...service, get: () => 'true' }}>
				<LiveToggle urlParam="live" onChange={onChange} />
			</UrlParamContext.Provider>
		);
		fireEvent.click(screen.getByRole('button'));
		expect(set).toHaveBeenLastCalledWith('live', 'false', { replace: true });
		expect(onChange).not.toHaveBeenCalled();
	});

	it('does nothing on click when it is neither controlled nor URL-backed', () => {
		render(<LiveToggle />);
		expect(() => fireEvent.click(screen.getByRole('button'))).not.toThrow();
		expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
	});
});
