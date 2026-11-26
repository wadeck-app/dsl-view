// A short message that wraps (the feedback of an action in a narrow column), where Badge keeps one line.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Notice } from './Notice.js';

afterEach(() => vi.restoreAllMocks());

const LONG = 'replay the failed events with: ' + 'x'.repeat(200);

describe('Notice', () => {
	it('shows the message as a polite status by default', () => {
		render(<Notice label="Saved" />);
		expect(screen.getByRole('status')).toHaveTextContent('Saved');
	});

	it('a danger notice is an alert', () => {
		render(<Notice label="Failed" variant="danger" />);
		expect(screen.getByRole('alert')).toHaveTextContent('Failed');
	});

	it('uses the Badge variant vocabulary and colours', () => {
		const { rerender } = render(<Notice label="m" variant="warning" />);
		expect(screen.getByRole('status')).toHaveClass('bg-warning-bg', 'text-warning-text');
		rerender(<Notice label="m" variant="success" />);
		expect(screen.getByRole('status')).toHaveClass('bg-success-bg', 'text-success-text');
		rerender(<Notice label="m" variant="default" />);
		expect(screen.getByRole('status')).toHaveClass('bg-muted-bg', 'text-muted');
	});

	it('wraps instead of overflowing a narrow column', () => {
		render(<Notice label="a message" />);
		const box = screen.getByRole('status');
		expect(box).toHaveClass('min-w-0', 'break-words');
		expect(box.className).not.toContain('whitespace-nowrap');
	});

	it('renders nothing for an empty message', () => {
		const { container } = render(<Notice label="" />);
		expect(container).toBeEmptyDOMElement();
	});

	it('a short message has no expander', () => {
		render(<Notice label="short" />);
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('a long message is clamped to three lines behind Show more, and nothing is cut for good', async () => {
		const user = userEvent.setup();
		render(<Notice label={LONG} />);
		const text = screen.getByText(LONG);
		expect(text).toHaveClass('line-clamp-3');
		const toggle = screen.getByRole('button', { name: 'Show more' });
		expect(toggle).toHaveAttribute('aria-expanded', 'false');
		await user.click(toggle);
		expect(text).not.toHaveClass('line-clamp-3');
		expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true');
	});

	it('the expander labels can be translated', () => {
		render(<Notice label={LONG} showMoreLabel="Expand" showLessLabel="Collapse" />);
		expect(screen.getByRole('button', { name: 'Expand' })).toBeInTheDocument();
	});

	it('an unknown variant is reported and falls back to info', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		// @ts-expect-error -- a DSL page can write any string
		render(<Notice label="m" variant="neutral" />);
		expect(screen.getByRole('status')).toHaveClass('bg-info-bg');
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('[Notice] unknown variant "neutral"'));
	});
});
