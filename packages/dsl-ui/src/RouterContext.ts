import { createContext, useContext } from 'react';

export interface RouterService {
	navigate: (path: string) => void;
	back: () => void;
}

export const RouterContext = createContext<RouterService | null>(null);

export function useRouter(): RouterService {
	const ctx = useContext(RouterContext);
	if (!ctx) throw new Error('useRouter() requires RouterContext -- wrap your app in <RouterProvider>');
	return ctx;
}
