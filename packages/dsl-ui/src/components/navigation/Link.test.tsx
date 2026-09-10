import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Link } from './Link.js';

describe('Link', () => {
	it('renders the label', () => {
		render(<Link href="/foo" label="Go to foo" />);
		expect(screen.getByText('Go to foo')).toBeInTheDocument();
	});

	it('sets the href', () => {
		render(<Link href="/bar" label="Bar" />);
		expect(screen.getByRole('link')).toHaveAttribute('href', '/bar');
	});

	it('opens in new tab when external', () => {
		render(<Link href="https://example.com" label="External" external />);
		const link = screen.getByRole('link');
		expect(link).toHaveAttribute('target', '_blank');
		expect(link).toHaveAttribute('rel', 'noopener noreferrer');
	});

	it('does not set target when not external', () => {
		render(<Link href="/internal" label="Internal" />);
		expect(screen.getByRole('link')).not.toHaveAttribute('target');
	});
});
