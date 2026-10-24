import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PageTabs } from './PageTabs.js';

const tabs = [
	{ id: 'one', label: 'One', children: <p>One content</p> },
	{ id: 'two', label: 'Two', children: <p>Two content</p> },
	{ id: 'three', label: 'Three', children: <p>Three content</p> },
];

const selected = () => screen.getAllByRole('tab').filter(t => t.getAttribute('aria-selected') === 'true').map(t => t.textContent);

describe('PageTabs', () => {
	it('renders a tablist with a tab per entry, in order', () => {
		render(<PageTabs tabs={tabs} activeTab="one" onChange={vi.fn()} />);
		expect(screen.getByRole('tablist')).toBeInTheDocument();
		expect(screen.getAllByRole('tab').map(t => t.textContent)).toEqual(['One', 'Two', 'Three']);
	});

	it('selects exactly the active tab and shows only its content in a panel labelled by it', () => {
		render(<PageTabs tabs={tabs} activeTab="two" onChange={vi.fn()} />);
		expect(selected()).toEqual(['Two']);
		const panel = screen.getByRole('tabpanel');
		expect(panel).toHaveTextContent('Two content');
		expect(panel).toHaveAccessibleName('Two');
		expect(screen.queryByText('One content')).not.toBeInTheDocument();
	});

	it('clicking a tab reports its id and, being controlled, does not switch by itself', async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<PageTabs tabs={tabs} activeTab="one" onChange={onChange} />);
		await user.click(screen.getByRole('tab', { name: 'Three' }));
		expect(onChange).toHaveBeenCalledExactlyOnceWith('three');
		expect(selected()).toEqual(['One']);
		expect(screen.getByRole('tabpanel')).toHaveTextContent('One content');
	});

	it('follows the activeTab prop when the parent changes it', () => {
		const { rerender } = render(<PageTabs tabs={tabs} activeTab="one" onChange={vi.fn()} />);
		rerender(<PageTabs tabs={tabs} activeTab="three" onChange={vi.fn()} />);
		expect(selected()).toEqual(['Three']);
		expect(screen.getByRole('tabpanel')).toHaveTextContent('Three content');
	});

	it.each([[''], ['missing']])('an activeTab of %j falls back to the first tab for the selection AND the content', activeTab => {
		render(<PageTabs tabs={tabs} activeTab={activeTab} onChange={vi.fn()} />);
		expect(selected()).toEqual(['One']);
		expect(screen.getByRole('tabpanel')).toHaveTextContent('One content');
	});

	it('renders an empty tablist and panel without throwing when there are no tabs', () => {
		render(<PageTabs tabs={[]} activeTab="" onChange={vi.fn()} />);
		expect(screen.queryAllByRole('tab')).toHaveLength(0);
		expect(screen.getByRole('tabpanel')).toBeEmptyDOMElement();
	});

	describe('keyboard', () => {
		it('only the selected tab is in the tab order', () => {
			render(<PageTabs tabs={tabs} activeTab="two" onChange={vi.fn()} />);
			expect(screen.getAllByRole('tab').map(t => t.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
		});

		it('arrow keys report the neighbouring id, wrapping around, and move focus there', () => {
			const onChange = vi.fn();
			render(<PageTabs tabs={tabs} activeTab="three" onChange={onChange} />);
			const three = screen.getByRole('tab', { name: 'Three' });
			three.focus();
			expect(fireEvent.keyDown(three, { key: 'ArrowRight' })).toBe(false);
			expect(onChange).toHaveBeenLastCalledWith('one');
			expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'One' }));
			fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'ArrowLeft' });
			expect(onChange).toHaveBeenLastCalledWith('three');
		});

		it('Home and End report the first and last id', () => {
			const onChange = vi.fn();
			render(<PageTabs tabs={tabs} activeTab="two" onChange={onChange} />);
			const two = screen.getByRole('tab', { name: 'Two' });
			fireEvent.keyDown(two, { key: 'End' });
			expect(onChange).toHaveBeenLastCalledWith('three');
			fireEvent.keyDown(two, { key: 'Home' });
			expect(onChange).toHaveBeenLastCalledWith('one');
		});

		it('other keys are left alone', () => {
			const onChange = vi.fn();
			render(<PageTabs tabs={tabs} activeTab="one" onChange={onChange} />);
			expect(fireEvent.keyDown(screen.getByRole('tab', { name: 'One' }), { key: 'a' })).toBe(true);
			expect(onChange).not.toHaveBeenCalled();
		});
	});

	// className already matches SIZE_CLASSES.md by coincidence, so a duplicate would be invisible
	// visually but still mean Button is injecting its default size behind the caller's back.
	it('does not duplicate the tab geometry classes via Button defaults', () => {
		render(<PageTabs tabs={tabs} activeTab="one" onChange={vi.fn()} />);
		const btn = screen.getByRole('tab', { name: 'One' });
		const occurrences = btn.className.split('px-4 py-2 text-sm font-medium').length - 1;
		expect(occurrences).toBe(1);
	});
});
