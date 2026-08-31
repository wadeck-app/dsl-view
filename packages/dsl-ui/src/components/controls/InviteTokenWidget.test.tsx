import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MockToastProvider, mockToast } from '../test-utils.js';
import { InviteTokenWidget } from './InviteTokenWidget.js';

function renderWidget(props: React.ComponentProps<typeof InviteTokenWidget>) {
	return render(
		<MockToastProvider>
			<InviteTokenWidget {...props} />
		</MockToastProvider>
	);
}

describe('InviteTokenWidget', () => {
	const originalClipboard = navigator.clipboard;

	beforeEach(() => {
		vi.clearAllMocks();
		Object.defineProperty(navigator, 'clipboard', {
			value: { writeText: vi.fn().mockResolvedValue(undefined) },
			writable: true,
			configurable: true,
		});
	});

	afterEach(() => {
		Object.defineProperty(navigator, 'clipboard', {
			value: originalClipboard,
			writable: true,
			configurable: true,
		});
	});

	it('shows "Generate" button when no token', () => {
		renderWidget({ inviteToken: null, onGenerateToken: vi.fn() });
		expect(screen.getByText('Generate invite token')).toBeInTheDocument();
	});

	it('shows Generate button when inviteToken=undefined', () => {
		renderWidget({ inviteToken: undefined, onGenerateToken: vi.fn() });
		expect(screen.getByText('Generate invite token')).toBeInTheDocument();
	});

	it('shows token in code block when token provided', () => {
		renderWidget({ inviteToken: 'abc-123', onGenerateToken: vi.fn() });
		expect(screen.getByText('abc-123')).toBeInTheDocument();
	});

	it('Generate button calls onGenerateToken', () => {
		const onGenerateToken = vi.fn();
		renderWidget({ inviteToken: null, onGenerateToken });
		fireEvent.click(screen.getByText('Generate invite token'));
		expect(onGenerateToken).toHaveBeenCalledOnce();
	});

	it('Generate button is disabled when isPending=true', () => {
		renderWidget({ inviteToken: null, onGenerateToken: vi.fn(), isPending: true });
		expect(screen.getByRole('button')).toBeDisabled();
	});

	it('shows "Generating..." label when isPending=true', () => {
		renderWidget({ inviteToken: null, onGenerateToken: vi.fn(), isPending: true });
		expect(screen.getByRole('button')).toHaveTextContent('Generating...');
	});

	it('Copy button is present when token exists', () => {
		renderWidget({ inviteToken: 'abc-123', onGenerateToken: vi.fn() });
		expect(screen.getByText('Copy')).toBeInTheDocument();
	});

	it('clicking Copy calls clipboard.writeText with the token', () => {
		renderWidget({ inviteToken: 'abc-123', onGenerateToken: vi.fn() });
		fireEvent.click(screen.getByText('Copy'));
		expect(navigator.clipboard.writeText).toHaveBeenCalledWith('abc-123');
	});

	it('shows success toast when clipboard copy succeeds', async () => {
		renderWidget({ inviteToken: 'abc-123', onGenerateToken: vi.fn() });
		fireEvent.click(screen.getByText('Copy'));
		await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith('Token copied to clipboard'));
	});

	it('shows error toast when clipboard.writeText rejects', async () => {
		Object.defineProperty(navigator, 'clipboard', {
			value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
			writable: true,
			configurable: true,
		});
		renderWidget({ inviteToken: 'abc-123', onGenerateToken: vi.fn() });
		fireEvent.click(screen.getByText('Copy'));
		await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('Failed to copy - please copy manually'));
	});
});
