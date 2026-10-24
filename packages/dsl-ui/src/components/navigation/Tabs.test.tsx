import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Tabs } from './Tabs.js';

const tabs = [
	{ key: 'one', label: 'One', children: <p>One content</p> },
	{ key: 'two', label: 'Two', children: <p>Two content</p> },
	{ key: 'three', label: 'Three', children: <p>Three content</p> },
];

describe('Tabs', () => {
	it('renders a tablist with one tab per entry, the first selected by default', () => {
		render(<Tabs tabs={tabs} />);
		expect(screen.getByRole('tablist')).toBeInTheDocument();
		expect(screen.getAllByRole('tab').map(t => t.textContent)).toEqual(['One', 'Two', 'Three']);
		expect(screen.getByRole('tab', { name: 'One' })).toHaveAttribute('aria-selected', 'true');
		expect(screen.getByRole('tab', { name: 'Two' })).toHaveAttribute('aria-selected', 'false');
		expect(screen.getByRole('tab', { name: 'Three' })).toHaveAttribute('aria-selected', 'false');
	});

	it('shows only the active tab content, in a tabpanel labelled by the active tab', () => {
		render(<Tabs tabs={tabs} />);
		const panel = screen.getByRole('tabpanel');
		expect(panel).toHaveTextContent('One content');
		expect(screen.queryByText('Two content')).not.toBeInTheDocument();
		expect(panel).toHaveAccessibleName('One');
		expect(screen.getByRole('tab', { name: 'One' })).toHaveAttribute('aria-controls', panel.id);
	});

	it('clicking a tab switches the content and the selected state', async () => {
		const user = userEvent.setup();
		render(<Tabs tabs={tabs} />);
		await user.click(screen.getByRole('tab', { name: 'Two' }));
		expect(screen.getByRole('tab', { name: 'Two' })).toHaveAttribute('aria-selected', 'true');
		expect(screen.getByRole('tab', { name: 'One' })).toHaveAttribute('aria-selected', 'false');
		expect(screen.getByRole('tabpanel')).toHaveTextContent('Two content');
		expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Two');
		expect(screen.queryByText('One content')).not.toBeInTheDocument();
	});

	it('defaultTab selects another tab initially', () => {
		render(<Tabs tabs={tabs} defaultTab="three" />);
		expect(screen.getByRole('tab', { name: 'Three' })).toHaveAttribute('aria-selected', 'true');
		expect(screen.getByRole('tabpanel')).toHaveTextContent('Three content');
	});

	it('falls back to the first tab when the active key matches no tab', () => {
		render(<Tabs tabs={tabs} defaultTab="missing" />);
		expect(screen.getByRole('tab', { name: 'One' })).toHaveAttribute('aria-selected', 'true');
		expect(screen.getByRole('tabpanel')).toHaveTextContent('One content');
	});

	it('onChange reports the clicked key', async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<Tabs tabs={tabs} onChange={onChange} />);
		await user.click(screen.getByRole('tab', { name: 'Three' }));
		expect(onChange).toHaveBeenCalledExactlyOnceWith('three');
	});

	it('controlled: the value prop decides, a click only reports and does not switch by itself', async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		const { rerender } = render(<Tabs tabs={tabs} value="two" onChange={onChange} />);
		expect(screen.getByRole('tab', { name: 'Two' })).toHaveAttribute('aria-selected', 'true');
		await user.click(screen.getByRole('tab', { name: 'Three' }));
		expect(onChange).toHaveBeenCalledExactlyOnceWith('three');
		expect(screen.getByRole('tab', { name: 'Two' })).toHaveAttribute('aria-selected', 'true');
		expect(screen.getByRole('tabpanel')).toHaveTextContent('Two content');
		rerender(<Tabs tabs={tabs} value="three" onChange={onChange} />);
		expect(screen.getByRole('tabpanel')).toHaveTextContent('Three content');
	});

	it('renders an empty tablist and panel without throwing when there are no tabs', () => {
		render(<Tabs tabs={[]} />);
		expect(screen.queryAllByRole('tab')).toHaveLength(0);
		expect(screen.getByRole('tabpanel')).toBeEmptyDOMElement();
	});

	describe('keyboard', () => {
		it('only the selected tab is in the tab order (roving tabindex)', () => {
			render(<Tabs tabs={tabs} defaultTab="two" />);
			expect(screen.getByRole('tab', { name: 'One' })).toHaveAttribute('tabindex', '-1');
			expect(screen.getByRole('tab', { name: 'Two' })).toHaveAttribute('tabindex', '0');
			expect(screen.getByRole('tab', { name: 'Three' })).toHaveAttribute('tabindex', '-1');
		});

		it('ArrowRight selects and focuses the next tab and wraps from the last to the first', () => {
			render(<Tabs tabs={tabs} defaultTab="three" />);
			const three = screen.getByRole('tab', { name: 'Three' });
			three.focus();
			expect(fireEvent.keyDown(three, { key: 'ArrowRight' })).toBe(false);
			const one = screen.getByRole('tab', { name: 'One' });
			expect(one).toHaveAttribute('aria-selected', 'true');
			expect(document.activeElement).toBe(one);
			fireEvent.keyDown(one, { key: 'ArrowRight' });
			expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Two' }));
			expect(screen.getByRole('tabpanel')).toHaveTextContent('Two content');
		});

		it('ArrowLeft goes to the previous tab and wraps from the first to the last', () => {
			render(<Tabs tabs={tabs} />);
			const one = screen.getByRole('tab', { name: 'One' });
			one.focus();
			fireEvent.keyDown(one, { key: 'ArrowLeft' });
			expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Three' }));
			expect(screen.getByRole('tab', { name: 'Three' })).toHaveAttribute('aria-selected', 'true');
		});

		it('Home and End jump to the first and last tab', () => {
			render(<Tabs tabs={tabs} defaultTab="two" />);
			const two = screen.getByRole('tab', { name: 'Two' });
			two.focus();
			fireEvent.keyDown(two, { key: 'End' });
			expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Three' }));
			fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Home' });
			expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'One' }));
		});

		it('other keys are left alone (default not prevented)', () => {
			render(<Tabs tabs={tabs} />);
			const one = screen.getByRole('tab', { name: 'One' });
			expect(fireEvent.keyDown(one, { key: 'a' })).toBe(true);
			expect(one).toHaveAttribute('aria-selected', 'true');
		});

		it('keyboard navigation reports through onChange', () => {
			const onChange = vi.fn();
			render(<Tabs tabs={tabs} onChange={onChange} />);
			fireEvent.keyDown(screen.getByRole('tab', { name: 'One' }), { key: 'ArrowRight' });
			expect(onChange).toHaveBeenCalledExactlyOnceWith('two');
		});
	});

	// The tab owns its own geometry via className; Button must not also inject SIZE_CLASSES.md.
	it('does not let Button inject SIZE_CLASSES.md alongside its own geometry', () => {
		render(<Tabs tabs={tabs} />);
		const btn = screen.getByRole('tab', { name: 'One' });
		expect(btn.className).not.toMatch(/\bpy-2\b/);
		expect(btn.className).toMatch(/\bpy-1\.5\b/);
	});
});
