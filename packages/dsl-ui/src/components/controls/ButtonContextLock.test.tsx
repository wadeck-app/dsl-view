// A container that provides a ButtonContext owns the geometry of its buttons: a big button, a medium one and a small icon in the
// same bar read as three scales. Inside such a container (ActionBar, CardActions, DialogFooter, NavBar, TableRowActions) a
// button's own `size` no longer wins; it is reported once so the author removes it. A bare ButtonContext.Provider keeps the old
// rule (explicit size wins), and `size="none"` (chips, tabs that own their geometry) is never touched.
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetReportedMessages } from '../dev/reportOnce.js';
import { ActionBar } from '../layout/ActionBar.js';
import { CardActions } from '../layout/CardActions.js';
import { DialogFooter } from '../layout/DialogFooter.js';
import { ActionButton } from './ActionButton.js';
import { ButtonAction } from './ButtonAction.js';
import { ButtonContext } from './buttonContext.js';
import { IconButton } from './IconButton.js';
import { Button } from './_Button.js';

beforeEach(() => resetReportedMessages());
afterEach(() => vi.restoreAllMocks());

const warnings = (spy: ReturnType<typeof vi.spyOn>) => spy.mock.calls.map((call: unknown[]) => String(call[0])).filter((message: string) => message.includes('is ignored inside'));

describe('a container owns the size of its buttons', () => {
	it('ActionBar: a button that asks for md gets the bar size, and the author is told', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		render(
			<ActionBar>
				<Button size="md">Big</Button>
				<ButtonAction label="Plain" />
			</ActionBar>
		);
		expect(screen.getByRole('button', { name: 'Big' })).toHaveClass('py-1', 'text-xs');
		expect(screen.getByRole('button', { name: 'Big' })).not.toHaveClass('py-2');
		expect(screen.getByRole('button', { name: 'Plain' })).toHaveClass('py-1', 'text-xs');
		const messages = warnings(warn);
		expect(messages).toHaveLength(1);
		expect(messages[0]).toContain('size "md"');
		expect(messages[0]).toContain('ActionBar');
		expect(messages[0]).toContain('"sm"');
	});

	it('an icon button follows the bar too, without the author asking and without a warning', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		render(
			<ActionBar>
				<IconButton icon={<span />} aria-label="Edit" />
			</ActionBar>
		);
		expect(screen.getByRole('button', { name: 'Edit' })).toHaveClass('h-7', 'w-7');
		expect(screen.getByRole('button', { name: 'Edit' })).not.toHaveClass('h-9');
		expect(warnings(warn)).toEqual([]);
	});

	it('an icon button that asks for another icon size is brought back to the bar size and reported', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		render(
			<ActionBar>
				<IconButton icon={<span />} aria-label="Edit" size="icon" />
			</ActionBar>
		);
		expect(screen.getByRole('button', { name: 'Edit' })).toHaveClass('h-7', 'w-7');
		expect(warnings(warn)).toHaveLength(1);
	});

	it('ActionButton and ButtonAction with the bar size say nothing', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		render(
			<ActionBar>
				<ButtonAction label="A" size="sm" />
				<ActionButton action="x" label="B" size="sm" onAction={() => undefined} />
			</ActionBar>
		);
		expect(warnings(warn)).toEqual([]);
	});

	it('size="none" (a component that owns its geometry) is left alone', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		render(
			<ActionBar>
				<Button size="none">Own</Button>
			</ActionBar>
		);
		expect(screen.getByRole('button', { name: 'Own' }).className).not.toContain('py-1');
		expect(warnings(warn)).toEqual([]);
	});

	it('DialogFooter keeps its own scale (md) for every button', () => {
		render(
			<DialogFooter>
				<Button size="sm">Small</Button>
			</DialogFooter>
		);
		expect(screen.getByRole('button', { name: 'Small' })).toHaveClass('py-2', 'text-sm');
	});

	it('CardActions owns the size as well', () => {
		render(
			<CardActions>
				<Button size="md">Big</Button>
			</CardActions>
		);
		expect(screen.getByRole('button', { name: 'Big' })).toHaveClass('py-1');
	});

	it('the same mismatch is reported once per message, not once per render', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const { rerender } = render(
			<ActionBar>
				<Button size="md">Big</Button>
			</ActionBar>
		);
		rerender(
			<ActionBar>
				<Button size="md">Big</Button>
			</ActionBar>
		);
		expect(warnings(warn)).toHaveLength(1);
	});
});

describe('a bare ButtonContext.Provider is unchanged', () => {
	it('the explicit size still wins', () => {
		render(
			<ButtonContext.Provider value={{ size: 'sm' }}>
				<Button size="md">Big</Button>
			</ButtonContext.Provider>
		);
		expect(screen.getByRole('button', { name: 'Big' })).toHaveClass('py-2');
	});
});
