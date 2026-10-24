import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ActionButton } from './ActionButton.js';

function deferred() {
	let resolve!: () => void;
	let reject!: (e: Error) => void;
	const promise = new Promise<void>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('ActionButton (component)', () => {
	it('runs its action with the params on click, and with {} when there are none', async () => {
		const onAction = vi.fn().mockResolvedValue(undefined);
		const { rerender } = render(<ActionButton action="pushTest" label="Push" params={{ name: 'ping' }} onAction={onAction} />);
		fireEvent.click(screen.getByRole('button', { name: 'Push' }));
		expect(onAction).toHaveBeenCalledTimes(1);
		expect(onAction).toHaveBeenLastCalledWith('pushTest', { name: 'ping' }, undefined);
		// The first call settles before the next click: the button ignores clicks while a call runs.
		await act(async () => undefined);

		rerender(<ActionButton action="giveUp" label="Give up" onAction={onAction} />);
		fireEvent.click(screen.getByRole('button', { name: 'Give up' }));
		expect(onAction).toHaveBeenLastCalledWith('giveUp', {}, undefined);
	});

	it('hands the body to the action only when there is one', async () => {
		const onAction = vi.fn();
		const { rerender } = render(<ActionButton action="a" label="Go" body={{ payload: 'x' }} onAction={onAction} />);
		fireEvent.click(screen.getByRole('button', { name: 'Go' }));
		expect(onAction).toHaveBeenLastCalledWith('a', {}, { body: { payload: 'x' } });
		// The first call settles before the next click: the button ignores clicks while a call runs.
		await act(async () => undefined);

		rerender(<ActionButton action="b" label="Go" onAction={onAction} />);
		fireEvent.click(screen.getByRole('button', { name: 'Go' }));
		expect(onAction).toHaveBeenLastCalledWith('b', {}, undefined);
	});

	it('is enabled by default', () => {
		render(<ActionButton action="a" label="Go" onAction={vi.fn()} />);
		expect(screen.getByRole('button', { name: 'Go' })).toBeEnabled();
	});

	it('stays disabled when told so, and a click does nothing', () => {
		const onAction = vi.fn();
		render(<ActionButton action="a" label="Go" disabled onAction={onAction} />);
		const button = screen.getByRole('button', { name: 'Go' });
		expect(button).toBeDisabled();
		fireEvent.click(button);
		expect(onAction).not.toHaveBeenCalled();
	});

	it('is disabled and aria-busy while ITS action is pending, not while another action is', () => {
		const { rerender } = render(<ActionButton action="a" label="Go" onAction={vi.fn()} actionPending={{ a: true }} />);
		expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled();
		expect(screen.getByRole('button', { name: 'Go' })).toHaveAttribute('aria-busy', 'true');

		rerender(<ActionButton action="a" label="Go" onAction={vi.fn()} actionPending={{ other: true }} />);
		expect(screen.getByRole('button', { name: 'Go' })).toBeEnabled();
		expect(screen.getByRole('button', { name: 'Go' })).not.toHaveAttribute('aria-busy');

		rerender(<ActionButton action="a" label="Go" onAction={vi.fn()} actionPending={{ a: false }} />);
		expect(screen.getByRole('button', { name: 'Go' })).toBeEnabled();
	});

	it('ignores a second click while the first call is still running, then is usable again', async () => {
		const pending = deferred();
		const onAction = vi.fn().mockReturnValue(pending.promise);
		render(<ActionButton action="a" label="Go" onAction={onAction} />);
		const button = screen.getByRole('button', { name: 'Go' });

		fireEvent.click(button);
		fireEvent.click(button);
		expect(onAction).toHaveBeenCalledTimes(1);
		expect(button).toBeDisabled();

		await act(async () => {
			pending.resolve();
		});
		expect(button).toBeEnabled();
		fireEvent.click(button);
		expect(onAction).toHaveBeenCalledTimes(2);
	});

	it('logs a rejecting host handler with the action name and becomes usable again', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const pending = deferred();
		render(<ActionButton action="pushTest" label="Go" onAction={() => pending.promise} />);

		fireEvent.click(screen.getByRole('button', { name: 'Go' }));
		await act(async () => {
			pending.reject(new Error('boom'));
		});

		expect(error).toHaveBeenCalledWith('[ActionButton] action "pushTest" failed: boom');
		expect(screen.getByRole('button', { name: 'Go' })).toBeEnabled();
	});

	it('with iconOnly, shows no text but keeps the label as accessible name and tooltip', () => {
		render(<ActionButton action="a" label="Push test event" icon="rocket" iconOnly onAction={vi.fn()} />);
		const button = screen.getByRole('button', { name: 'Push test event' });
		expect(button).toHaveAttribute('title', 'Push test event');
		expect(button.textContent).toBe('');
		expect(button.querySelector('svg')).not.toBeNull();
	});

	it('with an icon and a label, shows both', () => {
		render(<ActionButton action="a" label="Push" icon="rocket" onAction={vi.fn()} />);
		const button = screen.getByRole('button', { name: 'Push' });
		expect(button.textContent).toBe('Push');
		expect(button.querySelector('svg')).not.toBeNull();
		expect(button).not.toHaveAttribute('title');
	});

	it('iconOnly without an icon says so once and keeps showing the label', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		render(<ActionButton action="a" label="Needs an icon" iconOnly onAction={vi.fn()} />);
		expect(screen.getByRole('button', { name: 'Needs an icon' }).textContent).toBe('Needs an icon');
		expect(error).toHaveBeenCalledWith(expect.stringContaining('[ActionButton] "Needs an icon": iconOnly needs an icon name'));
	});

	it('replaces the icon by a spinner while busy', () => {
		render(<ActionButton action="a" label="Push" icon="rocket" onAction={vi.fn()} actionPending={{ a: true }} />);
		const button = screen.getByRole('button', { name: 'Push' });
		expect(button.querySelectorAll('svg')).toHaveLength(1);
		expect(button.querySelector('svg')).toHaveClass('animate-spin');
	});

	it('is disabled with an explanation and logs an error when rendered outside a page (no onAction)', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		render(<ActionButton action="pushTest" label="Push" />);
		expect(screen.getByRole('button', { name: 'Push' })).toBeDisabled();
		expect(error).toHaveBeenCalledWith(
			'[ActionButton] "Push" cannot run action "pushTest": render it inside a GenericPageRunner (it provides onAction) or pass onAction.'
		);
	});

	it('reports an unknown icon name once with the supported names', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		render(<ActionButton action="a" label="Push" icon="not-an-icon" onAction={vi.fn()} />);
		expect(error).toHaveBeenCalledWith(expect.stringContaining('[ActionButton.icon] unknown icon "not-an-icon"'));
	});
});
