import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tabs } from './Tabs.js';

const tabs = [
	{ key: 'one', label: 'One', children: <p>One content</p> },
	{ key: 'two', label: 'Two', children: <p>Two content</p> },
];

describe('Tabs', () => {
	it('renders a button per tab', () => {
		render(<Tabs tabs={tabs} />);
		expect(screen.getByRole('button', { name: 'One' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Two' })).toBeInTheDocument();
	});

	// The tab owns its own geometry via className; Button must not also inject SIZE_CLASSES.md.
	it('does not let Button inject SIZE_CLASSES.md alongside its own geometry', () => {
		render(<Tabs tabs={tabs} />);
		const btn = screen.getByRole('button', { name: 'One' });
		expect(btn.className).not.toMatch(/\bpy-2\b/);
		expect(btn.className).toMatch(/\bpy-1\.5\b/);
	});
});
