import { render } from '@testing-library/react';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';

import { ToastContext } from './components/overlay/Toast.js';

export const mockToast = {
	success: vi.fn(),
	error: vi.fn(),
	info: vi.fn(),
};

export function MockToastProvider({ children }: { children: React.ReactNode }) {
	return <ToastContext.Provider value={mockToast}>{children}</ToastContext.Provider>;
}

export function renderWithMocks(ui: React.ReactElement, options?: RenderOptions): RenderResult {
	return render(<MockToastProvider>{ui}</MockToastProvider>, options);
}
