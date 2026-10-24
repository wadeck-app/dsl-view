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

	it('a titled section is a region named by its title', () => {
		render(<Section title="Settings"><p>content</p></Section>);
		expect(screen.getByRole('region', { name: 'Settings' })).toContainElement(screen.getByText('content'));
	});

	it('an untitled section is not announced as a region', () => {
		render(<Section><p>content</p></Section>);
		expect(screen.queryByRole('region')).toBeNull();
	});

	it('two titled sections are named independently', () => {
		render(<><Section title="A"><p>a</p></Section><Section title="B"><p>b</p></Section></>);
		expect(screen.getByRole('region', { name: 'A' })).toHaveTextContent('a');
		expect(screen.getByRole('region', { name: 'B' })).toHaveTextContent('b');
	});

	it('an empty title string is treated as no title', () => {
		render(<Section title=""><p>content</p></Section>);
		expect(screen.queryByRole('heading')).toBeNull();
		expect(screen.queryByRole('region')).toBeNull();
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
