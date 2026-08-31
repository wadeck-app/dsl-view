import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Section } from './Section.js';

describe('Section', () => {
	it('renders h2 title when provided', () => {
		render(
			<Section title="Settings">
				<p>content</p>
			</Section>
		);
		expect(screen.getByRole('heading', { level: 2, name: 'Settings' })).toBeInTheDocument();
	});

	it('omits title when not provided', () => {
		render(
			<Section>
				<p>content</p>
			</Section>
		);
		expect(screen.queryByRole('heading')).not.toBeInTheDocument();
	});

	it('renders children', () => {
		render(
			<Section>
				<p>child content</p>
			</Section>
		);
		expect(screen.getByText('child content')).toBeInTheDocument();
	});
});
