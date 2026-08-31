import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MockToastProvider, mockToast } from '../test-utils.js';
import { FieldReadOnly } from './FieldReadOnly.js';

function renderField(props: React.ComponentProps<typeof FieldReadOnly>) {
	return render(
		<MockToastProvider>
			<FieldReadOnly {...props} />
		</MockToastProvider>
	);
}

describe('FieldReadOnly', () => {
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

	it('renders the label and value', () => {
		renderField({ label: 'Token', value: 'abc-123' });
		expect(screen.getByText('Token')).toBeInTheDocument();
		expect(screen.getByText('abc-123')).toBeInTheDocument();
	});

	it('applies font-mono class when mono=true', () => {
		renderField({ label: 'Token', value: 'abc-123', mono: true });
		expect(screen.getByText('abc-123')).toHaveClass('font-mono');
	});

	it('does not apply font-mono class when mono=false', () => {
		renderField({ label: 'Token', value: 'abc-123', mono: false });
		expect(screen.getByText('abc-123')).not.toHaveClass('font-mono');
	});

	it('does not render Copy button when copyable is false', () => {
		renderField({ label: 'Token', value: 'abc-123' });
		expect(screen.queryByText('Copy')).not.toBeInTheDocument();
	});

	it('renders Copy button when copyable is true', () => {
		renderField({ label: 'Token', value: 'abc-123', copyable: true });
		expect(screen.getByText('Copy')).toBeInTheDocument();
	});

	it('clicking Copy calls clipboard.writeText with the value', () => {
		renderField({ label: 'Token', value: 'abc-123', copyable: true });
		fireEvent.click(screen.getByText('Copy'));
		expect(navigator.clipboard.writeText).toHaveBeenCalledWith('abc-123');
	});

	it('shows success toast when clipboard copy succeeds', async () => {
		renderField({ label: 'Token', value: 'abc-123', copyable: true });
		fireEvent.click(screen.getByText('Copy'));
		await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith('Copied to clipboard'));
	});

	it('shows error toast when clipboard.writeText rejects', async () => {
		Object.defineProperty(navigator, 'clipboard', {
			value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
			writable: true,
			configurable: true,
		});
		renderField({ label: 'Token', value: 'abc-123', copyable: true });
		fireEvent.click(screen.getByText('Copy'));
		await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('Failed to copy - please copy manually'));
	});
});
