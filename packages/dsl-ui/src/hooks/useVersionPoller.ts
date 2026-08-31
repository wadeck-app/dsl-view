import { useToast } from '../components/overlay/Toast.js';
import { useEffect, useRef } from 'react';

declare global {
	interface Window {
		__APP_VERSION__?: string;
	}
}

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function useVersionPoller(versionEndpoint = '/api/version'): void {
	const toast = useToast();
	const toastShownRef = useRef(false);

	useEffect(() => {
		const currentVersion = window.__APP_VERSION__ ?? 'dev';

		async function checkVersion(): Promise<void> {
			if (toastShownRef.current) return;

			try {
				const res = await fetch(versionEndpoint);
				if (!res.ok) return;
				const data = (await res.json()) as { version: string };

				if (data.version !== currentVersion) {
					toastShownRef.current = true;
					toast.info('A new version is available - reload to update');
					setTimeout(() => window.location.reload(), 10_000);
				}
			} catch {
				// Network errors during polling are non-fatal - ignore silently
			}
		}

		void checkVersion();
		const id = setInterval(() => void checkVersion(), POLL_INTERVAL_MS);
		return () => clearInterval(id);
	}, [toast, versionEndpoint]);
}
