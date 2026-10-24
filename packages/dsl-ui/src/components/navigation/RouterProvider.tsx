import React, { useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { RouterContext } from '@dsl-ui/RouterContext.js';
import { UrlParamContext } from '@dsl-ui/context/UrlParamContext.js';
import type { UrlParamService } from '@dsl-ui/context/UrlParamContext.js';

/**
 * @registryCategory disposition
 * @registryTags router navigation
 */
export function RouterProvider({ children }: { children: React.ReactNode }) {
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();

	// Memoised so consumers of RouterContext do not re-render on every render of this provider.
	const routerService = useMemo(
		() => ({
			navigate: (path: string) => navigate(path),
			back: () => navigate(-1),
		}),
		[navigate]
	);

	// react-router builds the argument of a functional setSearchParams update from the params of the last RENDER, not
	// from the latest write. Two writes in one tick (a page writing `date` and `size` on open, then a click writing
	// `live`) would therefore start from the same base and the last one would erase the others. The params that the
	// next write must build on are tracked here: they move on with every write, and fall back to the committed
	// location as soon as it changes (an external navigation, or the commit of a write).
	const committedRef = useRef(searchParams);
	const latestRef = useRef(searchParams);
	if (committedRef.current !== searchParams) {
		committedRef.current = searchParams;
		latestRef.current = searchParams;
	}

	const urlParamService: UrlParamService = useMemo(
		() => ({
			get: (key: string) => searchParams.get(key),
			set: (key: string, value: string, opts?: { replace?: boolean; remove?: string[] }) => {
				const next = new URLSearchParams(latestRef.current);
				next.set(key, value);
				for (const removed of opts?.remove ?? []) {
					next.delete(removed);
				}
				latestRef.current = next;
				setSearchParams(next, { replace: opts?.replace ?? false });
			},
		}),
		[searchParams, setSearchParams]
	);

	return (
		<RouterContext.Provider value={routerService}>
			<UrlParamContext.Provider value={urlParamService}>
				{children}
			</UrlParamContext.Provider>
		</RouterContext.Provider>
	);
}
