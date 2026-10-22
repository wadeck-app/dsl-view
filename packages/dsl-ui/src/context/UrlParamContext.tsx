import { createContext, useContext, useMemo } from 'react';

export interface UrlParamService {
	get(key: string): string | null;
	/**
	 * `opts.remove` lists other keys to delete in the SAME URL update (one history entry). A host
	 * implementing this service must honour it: a control that asks for a reset (`resetUrlParams`)
	 * relies on it, and ignoring it would leave the stale key in the URL.
	 */
	set(key: string, value: string, opts?: { replace?: boolean; remove?: string[] }): void;
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
	if (!svc) {
		throw new Error('useUrlParam requires UrlParamContext');
	}
	return [svc.get(key), v => svc.set(key, v, { replace: true })];
}

/**
 * Generic mechanism for a component whose URL-param binding is itself optional: pass a key to
 * make the component URL-backed (reads/writes that search param), or undefined to let the
 * caller fully control the value via its own props instead. Any dsl-ui-* component that offers
 * dual "controlled prop" / "urlParam prop" modes (see Pagination.tsx, PageSizeSelect.tsx) should
 * use this rather than duplicating the branching logic.
 */
export function useOptionalUrlParam(
	key: string | undefined,
	opts?: { resetUrlParams?: string[] }
): [string | null, (v: string) => void] {
	const svc = useContext(UrlParamContext);
	const resetKeys = validateResetUrlParams(key, opts?.resetUrlParams);
	// Joined so a fresh array with the same keys on every render does not rebuild the setter.
	const resetSignature = resetKeys.join('\u0000');
	return useMemo(() => {
		if (key == null) {
			// No key bound - setter is unreachable by construction (adopting components branch
			// on `key` before ever calling it), kept as a safe no-op rather than a throw.
			return [null, () => {}] as [string | null, (v: string) => void];
		}
		if (!svc) {
			throw new Error(`useOptionalUrlParam("${key}") requires UrlParamContext (wrap the app in RouterProvider)`);
		}
		const remove = resetSignature === '' ? [] : resetSignature.split('\u0000');
		// Without a reset the call keeps its original shape, so existing hosts see no change.
		return [svc.get(key), (v: string) => svc.set(key, v, remove.length > 0 ? { replace: true, remove } : { replace: true })];
	}, [key, svc, resetSignature]);
}

// A bad `resetUrlParams` must fail loudly: ignoring it would leave a stale `page` in the URL
// and the page would look empty, which is the exact defect the prop exists to prevent.
function validateResetUrlParams(key: string | undefined, resetUrlParams: string[] | undefined): string[] {
	if (resetUrlParams === undefined) {
		return [];
	}
	if (!Array.isArray(resetUrlParams) || resetUrlParams.some(k => typeof k !== 'string' || k === '')) {
		throw new Error(`resetUrlParams must be an array of non-empty URL param names, got ${JSON.stringify(resetUrlParams)}`);
	}
	if (resetUrlParams.length === 0) {
		return [];
	}
	if (key == null) {
		throw new Error(`resetUrlParams (${resetUrlParams.join(', ')}) requires "urlParam": without it the control is not URL-backed and nothing would be reset`);
	}
	if (resetUrlParams.includes(key)) {
		throw new Error(`resetUrlParams must not contain the control's own urlParam "${key}": the control would delete the value it just wrote`);
	}
	return resetUrlParams;
}
