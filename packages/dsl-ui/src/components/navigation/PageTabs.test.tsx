import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageTabs } from './PageTabs.js';

const tabs = [
	{ id: 'one', label: 'One', children: <p>One content</p> },
	{ id: 'two', label: 'Two', children: <p>Two content</p> },
];

describe('PageTabs', () => {
	it('renders a tab button per entry', () => {
		render(<PageTabs tabs={tabs} activeTab="one" onChange={vi.fn()} />);
		expect(screen.getByRole('tab', { name: 'One' })).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: 'Two' })).toBeInTheDocument();
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
