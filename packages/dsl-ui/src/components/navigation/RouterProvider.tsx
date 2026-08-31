import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { RouterContext } from '../../RouterContext.js';
import { UrlParamContext } from '../../context/UrlParamContext.js';
import type { UrlParamService } from '../../context/UrlParamContext.js';

/**
 * @registryCategory disposition
 * @registryTags router navigation
 */
export function RouterProvider({ children }: { children: React.ReactNode }) {
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();

	const routerService = {
		navigate: (path: string) => navigate(path),
		back: () => navigate(-1),
	};

	const urlParamService: UrlParamService = useMemo(
		() => ({
			get: (key: string) => searchParams.get(key),
			set: (key: string, value: string, opts?: { replace?: boolean }) => {
				setSearchParams(
					prev => {
						const next = new URLSearchParams(prev);
						next.set(key, value);
						return next;
					},
					{ replace: opts?.replace ?? false }
				);
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
