import type { Meta, StoryObj } from '@storybook/react';
import { useEffect } from 'react';

import { ThemeScope } from '../layout/ThemeScope.js';
import { ToastProvider, useToast } from './Toast.js';

const meta: Meta<typeof ToastProvider> = {
	title: 'Overlay/Toast',
	component: ToastProvider,
	parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof ToastProvider>;

const LONG_WORD = 'x'.repeat(100);

// Fires one toast of each variant on mount (the stack sits at the bottom right of the viewport, oldest last), then
// an error with a 100-character unbreakable word: its dismiss button must stay inside the bubble, top right.
function Fire({ long }: { long: boolean }) {
	const toast = useToast();
	useEffect(() => {
		toast.info('Short info message');
		toast.success('Short success message');
		toast.error('Short error message');
		if (long) {
			toast.error(`The action failed (HTTP 503): ${LONG_WORD}`);
		}
	}, [toast, long]);
	return null;
}

function Scene({ theme, long }: { theme: 'light' | 'dark'; long: boolean }) {
	return (
		<ThemeScope theme={theme} surface="page" className="min-h-screen p-4">
			<ToastProvider>
				<p className="text-sm text-content">Toasts of every variant, bottom right.</p>
				<Fire long={long} />
			</ToastProvider>
		</ThemeScope>
	);
}

export const LightShortMessages: Story = { render: () => <Scene theme="light" long={false} /> };
export const DarkShortMessages: Story = { render: () => <Scene theme="dark" long={false} /> };
export const LightLongWord: Story = { render: () => <Scene theme="light" long /> };
export const DarkLongWord: Story = { render: () => <Scene theme="dark" long /> };
