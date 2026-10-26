import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AbDock, type AbTest } from './AbDock.js';

function fakeTest(id: string, label: string, optionIds: string[], value: string): AbTest {
	return {
		id,
		label,
		summary: value,
		options: optionIds.map((o) => ({ id: o, label: `Label ${o}`, title: `Hint ${o}` })),
		value,
		onSelect: () => {},
	};
}

const TESTS = [fakeTest('card', 'Card layout', ['cards', 'table'], 'table'), fakeTest('colour', 'Colour', ['a', 'b', 'c'], 'c'), fakeTest('gap', 'Gap', ['s', 'm'], 'm')];

// The button is an icon: its accessible name and tooltip carry the state, not a visible text.
const copyButton = () => screen.getByRole('button', { name: /^Copy report|^Copied|^Copy failed/ });

// jsdom has no clipboard: each test installs its own, vitest restores the global (unstubGlobals).
function stubClipboard(writeText: (text: string) => Promise<void>): void {
	vi.stubGlobal('navigator', { clipboard: { writeText } });
}

beforeEach(() => {
	localStorage.clear();
	window.history.pushState({}, '', '/page?x=1&ab.card=cards');
	vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
	window.history.pushState({}, '', '/');
});

describe('AbDock copy report button placement', () => {
	it('is a small icon button outside the stack of rows, in the frame next to the dock', () => {
		stubClipboard(() => Promise.resolve());
		render(<AbDock tests={TESTS} enabled />);
		const dock = screen.getByTestId('ab-dock');
		const button = copyButton();
		expect(dock.contains(button)).toBe(false);
		expect(screen.getByTestId('ab-dock-frame').contains(button)).toBe(true);
		// Icon only: no visible text, the name comes from aria-label and the tooltip is the same words.
		expect(button.textContent).toBe('');
		expect(button.querySelector('svg')).not.toBeNull();
		expect(button.getAttribute('title')).toBe('Copy report');
		expect(button.className).toContain('pointer-events-auto');
		// DOM order: after the dock, i.e. at the bottom right of the content area.
		expect(dock.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it('is not part of any row', () => {
		render(<AbDock tests={TESTS} enabled />);
		for (const group of screen.getAllByRole('group')) {
			expect(group.parentElement!.contains(copyButton())).toBe(false);
		}
	});

	it('is hidden while the dock is folded', () => {
		localStorage.setItem('ab.collapsed', 'collapsed');
		render(<AbDock tests={TESTS} enabled />);
		expect(screen.queryByRole('button', { name: /^Copy report/ })).not.toBeInTheDocument();
	});
});

describe('AbDock copy report', () => {
	it('copies the URL with every visible choice, then one id=option line per visible test', async () => {
		const writeText = vi.fn(() => Promise.resolve());
		stubClipboard(writeText);
		render(<AbDock tests={TESTS} enabled />);
		await act(async () => {
			fireEvent.click(copyButton());
		});
		expect(writeText).toHaveBeenCalledTimes(1);
		expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/page?x=1&ab.card=table&ab.colour=c&ab.gap=m\ncard=table\ncolour=c\ngap=m`);
	});

	it('leaves a hidden test out of the lines and out of the URL', async () => {
		const writeText = vi.fn(() => Promise.resolve());
		stubClipboard(writeText);
		render(<AbDock tests={TESTS} enabled />);
		fireEvent.click(screen.getByRole('button', { name: 'Hide Colour' }));
		await act(async () => {
			fireEvent.click(copyButton());
		});
		expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/page?x=1&ab.card=table&ab.gap=m\ncard=table\ngap=m`);
	});

	it('drops the stale param of a hidden test that was forced by the link', async () => {
		window.history.pushState({}, '', '/page?ab.colour=a');
		const writeText = vi.fn(() => Promise.resolve());
		stubClipboard(writeText);
		render(<AbDock tests={TESTS} enabled />);
		fireEvent.click(screen.getByRole('button', { name: 'Hide Colour' }));
		await act(async () => {
			fireEvent.click(copyButton());
		});
		expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/page?ab.card=table&ab.gap=m\ncard=table\ngap=m`);
	});

	it('shows Copied, then goes back to Copy report', async () => {
		stubClipboard(() => Promise.resolve());
		render(<AbDock tests={TESTS} enabled />);
		await act(async () => {
			fireEvent.click(copyButton());
		});
		expect(copyButton()).toHaveAccessibleName('Copied');
		expect(copyButton().getAttribute('title')).toBe('Copied');
		act(() => {
			vi.advanceTimersByTime(5000);
		});
		expect(copyButton()).toHaveAccessibleName('Copy report');
		expect(copyButton().getAttribute('title')).toBe('Copy report');
	});

	it('says so on the button and in the console, with the reason, when the clipboard refuses', async () => {
		stubClipboard(() => Promise.reject(new Error('Write permission denied.')));
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		render(<AbDock tests={TESTS} enabled />);
		await act(async () => {
			fireEvent.click(copyButton());
		});
		expect(copyButton()).toHaveAccessibleName('Copy failed');
		expect(copyButton().getAttribute('title')).toContain('Write permission denied.');
		expect(error).toHaveBeenCalledTimes(1);
		expect(String(error.mock.calls[0][0])).toContain('Write permission denied.');
	});

	it('says so when there is no clipboard at all (insecure context)', async () => {
		vi.stubGlobal('navigator', {});
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		render(<AbDock tests={TESTS} enabled />);
		await act(async () => {
			fireEvent.click(copyButton());
		});
		expect(copyButton()).toHaveAccessibleName('Copy failed');
		expect(String(error.mock.calls[0][0])).toContain('navigator.clipboard is unavailable');
		expect(String(error.mock.calls[0][0])).toContain('https');
	});

	it('is disabled, with the reason, when every test is hidden', () => {
		stubClipboard(() => Promise.resolve());
		render(<AbDock tests={[TESTS[0]]} enabled />);
		fireEvent.click(screen.getByRole('button', { name: 'Hide Card layout' }));
		expect(copyButton()).toBeDisabled();
		expect(copyButton().getAttribute('title')).toContain('hidden');
	});

	it('does not exist when the dock is off', () => {
		render(<AbDock tests={TESTS} enabled={false} />);
		expect(screen.queryByRole('button', { name: /Copy report/ })).not.toBeInTheDocument();
	});
});
