import { createContext, useContext } from 'react';

export interface UrlParamService {
	get(key: string): string | null;
	set(key: string, value: string, opts?: { replace?: boolean }): void;
}

export const UrlParamContext = createContext<UrlParamService | null>(null);

export function useUrlParam(key: string): [string | null, (v: string) => void] {
	const svc = useContext(UrlParamContext);
	if (!svc) throw new Error('useUrlParam requires UrlParamContext');
	return [svc.get(key), v => svc.set(key, v, { replace: true })];
}
