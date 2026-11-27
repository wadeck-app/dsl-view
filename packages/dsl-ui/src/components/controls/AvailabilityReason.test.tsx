// Every button says why it is unavailable, the same way: a disabled button (or link) carries a reason, shown in the tooltip and
// read by assistive technology. Before this, ButtonLink, RefreshButton, ButtonCancel and ChipButton could not.
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetReportedMessages } from '../dev/reportOnce.js';

import { ButtonCancel } from '../form/ButtonCancel.js';
import { ButtonLink } from '../navigation/ButtonLink.js';
import { ChipButton } from './ChipButton.js';
import { RefreshButton } from './RefreshButton.js';

beforeEach(() => resetReportedMessages());

const REASON = 'You need the admin role';
const reasonText = () => screen.getByRole('tooltip');

describe('ButtonCancel', () => {
	it('is disabled with a reason', () => {
		render(<ButtonCancel onCancel={() => undefined} disabled disabledReason={REASON} />);
		expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
		expect(reasonText()).toHaveTextContent(REASON);
	});

	it('shows no reason while enabled', () => {
		render(<ButtonCancel onCancel={() => undefined} disabledReason={REASON} />);
		expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
		expect(screen.queryByRole('tooltip')).toBeNull();
	});
});

describe('ChipButton', () => {
	it('is disabled with a reason and does not fire', () => {
		const onClick = vi.fn();
		render(
			<ChipButton active={false} onClick={onClick} disabled disabledReason={REASON}>
				Failed
			</ChipButton>
		);
		const chip = screen.getByRole('button', { name: 'Failed' });
		expect(chip).toBeDisabled();
		fireEvent.click(chip);
		expect(onClick).not.toHaveBeenCalled();
		expect(reasonText()).toHaveTextContent(REASON);
	});
});

describe('RefreshButton', () => {
	it('is disabled with a reason and does not refresh', () => {
		const onClick = vi.fn();
		render(<RefreshButton onClick={onClick} disabled disabledReason={REASON} />);
		const button = screen.getByRole('button', { name: 'Refresh' });
		expect(button).toBeDisabled();
		fireEvent.click(button);
		expect(onClick).not.toHaveBeenCalled();
		expect(reasonText()).toHaveTextContent(REASON);
	});

	it('keeps its own reason when nothing is wired, and the caller reason wins when given', () => {
		render(<RefreshButton disabled disabledReason={REASON} />);
		expect(reasonText()).toHaveTextContent(REASON);
	});
});

describe('ButtonLink', () => {
	it('enabled: a link to the route', () => {
		render(
			<MemoryRouter>
				<ButtonLink to="/logs" label="View logs" />
			</MemoryRouter>
		);
		expect(screen.getByRole('link', { name: 'View logs' })).toHaveAttribute('href', '/logs');
	});

	it('disabled: no destination, announced as disabled, with the reason', () => {
		render(
			<MemoryRouter>
				<ButtonLink to="/logs" label="View logs" disabled disabledReason={REASON} />
			</MemoryRouter>
		);
		const link = screen.getByText('View logs').closest('[aria-disabled="true"]')!;
		expect(link).not.toBeNull();
		expect(link).not.toHaveAttribute('href');
		expect(reasonText()).toHaveTextContent(REASON);
	});

	it('disabled without a reason still announces itself disabled and tells the author', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		render(
			<MemoryRouter>
				<ButtonLink to="/logs" label="View logs" disabled />
			</MemoryRouter>
		);
		expect(screen.getByText('View logs').closest('[aria-disabled="true"]')).not.toBeNull();
		expect(warn.mock.calls.map(call => String(call[0])).some(message => message.includes('disabledReason'))).toBe(true);
		warn.mockRestore();
	});
});
