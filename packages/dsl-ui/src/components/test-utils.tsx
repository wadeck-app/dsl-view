import React from 'react';
import { vi } from 'vitest';
import { ToastContext } from './overlay/Toast.js';

export const mockToast = {
	success: vi.fn(),
	error: vi.fn(),
	info: vi.fn(),
};

export function MockToastProvider({ children }: { children: React.ReactNode }) {
	return <ToastContext.Provider value={mockToast}>{children}</ToastContext.Provider>;
}
