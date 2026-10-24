import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HttpMethodBadge } from './HttpMethodBadge.js';
import { HttpStatusBadge } from './HttpStatusBadge.js';

// The hue token IS the contract of these badges (one colour per method / status family, resolved against the
// nearest theme scope), so the tests assert the specific token rather than the whole class string.
describe('HttpMethodBadge', () => {
	it.each([
		['GET', 'text-hue-blue'],
		['POST', 'text-hue-green'],
		['PUT', 'text-hue-yellow'],
		['PATCH', 'text-hue-orange'],
		['DELETE', 'text-hue-red'],
		['OPTIONS', 'text-hue-purple'],
		['HEAD', 'text-hue-cyan'],
	])('%s uses %s', (method, token) => {
		render(<HttpMethodBadge method={method} />);

		const badge = screen.getByText(method);
		expect(badge).toHaveClass(token);
		expect(badge).not.toHaveClass('text-content');
	});

	it('an unknown or differently cased method falls back to the neutral text colour and keeps its text', () => {
		render(
			<>
				<HttpMethodBadge method="TRACE" />
				<HttpMethodBadge method="get" />
			</>
		);

		expect(screen.getByText('TRACE')).toHaveClass('text-content');
		// Methods are matched exactly: a lower-case "get" is not coloured as GET.
		expect(screen.getByText('get')).toHaveClass('text-content');
		expect(screen.getByText('get')).not.toHaveClass('text-hue-blue');
	});
});

describe('HttpStatusBadge', () => {
	it.each([
		[200, 'text-hue-green'],
		[299, 'text-hue-green'],
		[300, 'text-hue-yellow'],
		[399, 'text-hue-yellow'],
		[400, 'text-hue-orange'],
		[499, 'text-hue-orange'],
		[500, 'text-hue-red'],
		[503, 'text-hue-red'],
	])('status %i uses %s (family boundaries are inclusive at the low end)', (status, token) => {
		render(<HttpStatusBadge status={status} />);

		expect(screen.getByText(String(status))).toHaveClass(token);
	});

	it('shows the status number as its text', () => {
		render(<HttpStatusBadge status={404} />);

		expect(screen.getByText('404')).toBeInTheDocument();
	});
});
