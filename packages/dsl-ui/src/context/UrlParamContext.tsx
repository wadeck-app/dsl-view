import { createContext, useContext, useMemo } from 'react';

export interface UrlParamService {
	get(key: string): string | null;
	set(key: string, value: string, opts?: { replace?: boolean }): void;
}

export const UrlParamContext = createContext<UrlParamService | null>(null);

// Backed by RouterProvider (react-router's useSearchParams under the hood), so a .set() here
// is a soft URL update, not a page reload - and GenericPageRunner's useSourceLoader already
// watches searchParams, so any $sources whose params reference $urlParam.<key> refetches
// automatically. This is the one sanctioned mechanism for a component to be URL-param-backed;
// any dsl-ui-* component wanting "urlParam: foo" YAML wiring should use this instead of
// inventing its own react-router plumbing.
export function useUrlParam(key: string): [string | null, (v: string) => void] {
	const svc = useContext(UrlParamContext);
	if (!svc) throw new Error('useUrlParam requires UrlParamContext');
	return [svc.get(key), v => svc.set(key, v, { replace: true })];
}

/**
 * Generic mechanism for a component whose URL-param binding is itself optional: pass a key to
 * make the component URL-backed (reads/writes that search param), or undefined to let the
 * caller fully control the value via its own props instead. Any dsl-ui-* component that offers
 * dual "controlled prop" / "urlParam prop" modes (see Pagination.tsx, PageSizeSelect.tsx) should
 * use this rather than duplicating the branching logic.
 */
export function useOptionalUrlParam(key: string | undefined): [string | null, (v: string) => void] {
	const svc = useContext(UrlParamContext);
	return useMemo(() => {
		if (key == null) {
			// No key bound - setter is unreachable by construction (adopting components branch
			// on `key` before ever calling it), kept as a safe no-op rather than a throw.
			return [null, () => {}] as [string | null, (v: string) => void];
		}
		if (!svc) {
			throw new Error(`useOptionalUrlParam("${key}") requires UrlParamContext (wrap the app in RouterProvider)`);
		}
		return [svc.get(key), (v: string) => svc.set(key, v, { replace: true })];
	}, [key, svc]);
}
