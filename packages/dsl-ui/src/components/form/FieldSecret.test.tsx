// A secret (passphrase, token) must not live in React state or props: the field is uncontrolled and the owner reads it
// from the DOM at the moment it needs it, then clears it.
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { FieldSecret } from './FieldSecret.js';
import type { FieldSecretHandle } from './FieldSecret.js';

const input = () => screen.getByLabelText('Passphrase') as HTMLInputElement;

describe('FieldSecret', () => {
	it('is a labelled password input that no password manager or spellchecker touches', () => {
		render(<FieldSecret label="Passphrase" />);
		expect(input()).toHaveAttribute('type', 'password');
		expect(input()).toHaveAttribute('autocomplete', 'off');
		expect(input()).toHaveAttribute('spellcheck', 'false');
	});

	it('has no value or onChange prop: the typed text is only in the DOM', async () => {
		const user = userEvent.setup();
		const renders = vi.fn();
		function Probe() {
			renders();
			return <FieldSecret label="Passphrase" />;
		}
		render(<Probe />);
		await user.type(input(), 'hunter2');
		expect(input().value).toBe('hunter2');
		// typing does not re-render the owner
		expect(renders).toHaveBeenCalledTimes(1);
	});

	it('is read and cleared through its handle', async () => {
		const user = userEvent.setup();
		const ref = React.createRef<FieldSecretHandle>();
		render(<FieldSecret label="Passphrase" ref={ref} />);
		await user.type(input(), 'hunter2');
		expect(ref.current!.read()).toBe('hunter2');
		act(() => ref.current!.clear());
		expect(input().value).toBe('');
		expect(ref.current!.read()).toBe('');
	});

	it('onEnter fires on Enter, and the owner reads the value then', async () => {
		const user = userEvent.setup();
		const ref = React.createRef<FieldSecretHandle>();
		const seen: string[] = [];
		render(<FieldSecret label="Passphrase" ref={ref} onEnter={() => seen.push(ref.current!.read())} />);
		await user.type(input(), 'abc{Enter}');
		expect(seen).toEqual(['abc']);
	});

	it('clears itself on unmount from the page: nothing outlives the field', () => {
		const { unmount } = render(<FieldSecret label="Passphrase" />);
		fireEvent.change(input(), { target: { value: 'x' } });
		const el = input();
		unmount();
		expect(el.value).toBe('');
	});

	it('shows the text on request, and hides it again', async () => {
		const user = userEvent.setup();
		render(<FieldSecret label="Passphrase" />);
		await user.click(screen.getByRole('button', { name: 'Show' }));
		expect(input()).toHaveAttribute('type', 'text');
		await user.click(screen.getByRole('button', { name: 'Hide' }));
		expect(input()).toHaveAttribute('type', 'password');
	});

	it('shows the error and marks the input invalid', () => {
		render(<FieldSecret label="Passphrase" error="Too short" />);
		expect(screen.getByText('Too short')).toBeInTheDocument();
		expect(input()).toHaveAttribute('aria-invalid', 'true');
	});

	it('can be disabled', () => {
		render(<FieldSecret label="Passphrase" disabled />);
		expect(input()).toBeDisabled();
	});

	it('stays out of password managers by default: no name, autocomplete off, ignore markers', () => {
		render(<FieldSecret label="Passphrase" />);
		expect(input()).not.toHaveAttribute('name');
		expect(input()).toHaveAttribute('data-1p-ignore');
		expect(input()).toHaveAttribute('data-lpignore', 'true');
	});

	it('autoComplete="current-password" with a name lets the browser save and fill it (no ignore markers)', () => {
		render(<FieldSecret label="Passphrase" name="passphrase" autoComplete="current-password" />);
		expect(input()).toHaveAttribute('name', 'passphrase');
		expect(input()).toHaveAttribute('autocomplete', 'current-password');
		expect(input()).not.toHaveAttribute('data-1p-ignore');
		expect(input()).not.toHaveAttribute('data-lpignore');
	});

	it('autoComplete="new-password" is also allowed', () => {
		render(<FieldSecret label="Passphrase" autoComplete="new-password" />);
		expect(input()).toHaveAttribute('autocomplete', 'new-password');
	});

	it('the handle can move the focus to the field', () => {
		const ref = React.createRef<FieldSecretHandle>();
		render(<FieldSecret label="Passphrase" ref={ref} />);
		act(() => ref.current!.focus());
		expect(document.activeElement).toBe(input());
	});
});
