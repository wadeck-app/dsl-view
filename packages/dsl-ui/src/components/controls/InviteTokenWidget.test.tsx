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

	// className ('px-3') used to collide with Button's default SIZE_CLASSES.md ('px-4').
	it('Copy button has no competing padding source', () => {
		renderWidget({ inviteToken: 'abc123', onGenerateToken: vi.fn() });
		const btn = screen.getByText('Copy').closest('button');
		expect(btn?.className).not.toMatch(/\bpx-4\b/);
		expect(btn?.className).toMatch(/\bpx-3\b/);
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

	it('the two modes are exclusive: a token hides Generate, no token hides Copy and the token block', () => {
		const { rerender } = renderWidget({ inviteToken: 'abc-123', onGenerateToken: vi.fn() });
		expect(screen.queryByText('Generate invite token')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
		rerender(
			<MockToastProvider>
				<InviteTokenWidget inviteToken={null} onGenerateToken={vi.fn()} />
			</MockToastProvider>
		);
		expect(screen.queryByRole('button', { name: 'Copy' })).not.toBeInTheDocument();
		expect(screen.queryByText('abc-123')).not.toBeInTheDocument();
	});

	it('an empty token counts as no token', () => {
		renderWidget({ inviteToken: '', onGenerateToken: vi.fn() });
		expect(screen.getByText('Generate invite token')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Copy' })).not.toBeInTheDocument();
	});

	it('a pending generation does not fire onGenerateToken again', () => {
		const onGenerateToken = vi.fn();
		renderWidget({ inviteToken: null, onGenerateToken, isPending: true });
		fireEvent.click(screen.getByRole('button'));
		expect(onGenerateToken).not.toHaveBeenCalled();
	});

	it('success and error feedback are exclusive', async () => {
		renderWidget({ inviteToken: 'abc-123', onGenerateToken: vi.fn() });
		fireEvent.click(screen.getByText('Copy'));
		await waitFor(() => expect(mockToast.success).toHaveBeenCalledTimes(1));
		expect(mockToast.error).not.toHaveBeenCalled();
	});

	it('says so when the clipboard API does not exist (insecure context) instead of throwing', () => {
		Object.defineProperty(navigator, 'clipboard', { value: undefined, writable: true, configurable: true });
		renderWidget({ inviteToken: 'abc-123', onGenerateToken: vi.fn() });
		expect(() => fireEvent.click(screen.getByText('Copy'))).not.toThrow();
		expect(mockToast.error).toHaveBeenCalledExactlyOnceWith('Failed to copy - please copy manually');
		expect(mockToast.success).not.toHaveBeenCalled();
	});

	it('a clipboard that throws synchronously (permissions policy, unfocused document) is reported, not thrown', () => {
		Object.defineProperty(navigator, 'clipboard', {
			value: { writeText: vi.fn(() => { throw new DOMException('Document is not focused', 'NotAllowedError'); }) },
			writable: true,
			configurable: true,
		});
		renderWidget({ inviteToken: 'abc-123', onGenerateToken: vi.fn() });
		expect(() => fireEvent.click(screen.getByText('Copy'))).not.toThrow();
		expect(mockToast.error).toHaveBeenCalledExactlyOnceWith('Failed to copy - please copy manually');
		expect(mockToast.success).not.toHaveBeenCalled();
	});

	it('Copy with a token copies exactly that token, once per click, without calling Generate', async () => {
		const onGenerateToken = vi.fn();
		renderWidget({ inviteToken: 'tok en/+=', onGenerateToken });
		fireEvent.click(screen.getByText('Copy'));
		fireEvent.click(screen.getByText('Copy'));
		expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(2);
		expect(navigator.clipboard.writeText).toHaveBeenNthCalledWith(1, 'tok en/+=');
		expect(onGenerateToken).not.toHaveBeenCalled();
		await waitFor(() => expect(mockToast.success).toHaveBeenCalledTimes(2));
	});

	it('the token is shown whole and verbatim in a monospace block', () => {
		renderWidget({ inviteToken: 'AbC-123_xyz.', onGenerateToken: vi.fn() });
		const block = screen.getByText('AbC-123_xyz.');
		expect(block.tagName).toBe('CODE');
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
