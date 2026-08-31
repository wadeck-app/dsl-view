import type { ApiRoutes, HttpMethod } from '../../routeBuilder.js';
import type { ContractAdapter, ResolvedRoute } from '../ContractAdapter.js';
import { normalizeUrlStructure } from '../urlNormalizer.js';

interface RouteMapEntry {
	contractKey: string;
	method: HttpMethod;
}

/**
 * ContractAdapter implementation for contracts built with defineRoutes() + Zod.
 *
 * At construction time, builds a lookup map from normalized structural URL form
 * to exact contract key so that YAML param names (e.g. {bookId}) can match
 * contract keys with different names (e.g. :id).
 *
 * Throws during construction if two contract keys have the same structural form
 * (would indicate a malformed contract — HTTP routers don't allow that).
 */
export class ZodContractAdapter implements ContractAdapter {
	private readonly lookupMap = new Map<string, RouteMapEntry>();

	constructor(
		private readonly routes: ApiRoutes,
		/** Name of the const as it appears in the import, e.g. "ALL_LIBRARY_ROUTES" */
		private readonly routesExportName: string,
		/** npm package name or workspace alias, e.g. "dsl-library-contracts" */
		private readonly importSource: string,
		/** Helper import source — defaults to same as importSource */
		private readonly helperImportSource: string = importSource,
	) {
		for (const [contractKey, pathRoutes] of Object.entries(routes)) {
			if (contractKey === '__baseUrl') continue;
			for (const method of Object.keys(pathRoutes) as HttpMethod[]) {
				const structuralKey = `${method}:${normalizeUrlStructure(contractKey)}`;
				if (this.lookupMap.has(structuralKey)) {
					const existing = this.lookupMap.get(structuralKey)!;
					throw new Error(
						`[ZodContractAdapter] Structural URL conflict: "${contractKey}" and "${existing.contractKey}" ` +
							`normalize to the same form for method ${method}. Contract is malformed.`,
					);
				}
				this.lookupMap.set(structuralKey, { contractKey, method });
			}
		}
	}

	resolve(method: HttpMethod, normalizedPath: string): ResolvedRoute | null {
		const key = `${method}:${normalizedPath}`;
		const entry = this.lookupMap.get(key);
		if (!entry) return null;

		const { contractKey } = entry;
		const pathRoutes = this.routes[contractKey];
		const contract = pathRoutes?.[method];
		if (!contract) return null;

		const r = this.routesExportName;
		const q = (s: string) => `'${s}'`;

		return {
			contractKey,
			method,
			responseTypeExpr: `RouteResponse<${q(method)}, ${q(contractKey)}, typeof ${r}>`,
			bodyTypeExpr: contract.body
				? `RouteBody<${q(method)}, ${q(contractKey)}, typeof ${r}>`
				: undefined,
			queryTypeExpr: contract.query
				? `RouteQuery<${q(method)}, ${q(contractKey)}, typeof ${r}>`
				: undefined,
		};
	}

	getImports(): string[] {
		return [
			`import { ${this.routesExportName} } from '${this.importSource}';`,
			`import type { RouteResponse, RouteBody, RouteQuery } from '${this.helperImportSource}';`,
		];
	}
}
