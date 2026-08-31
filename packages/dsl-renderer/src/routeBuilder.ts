import type { z } from 'zod';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type RouteContract = {
	params?: z.ZodTypeAny;
	query?: z.ZodTypeAny;
	body?: z.ZodTypeAny;
	response: z.ZodTypeAny;
};

export type PathRoutes = Partial<Record<HttpMethod, RouteContract>>;
export type ApiUrl = string;
export type ApiRoutes = Record<ApiUrl, PathRoutes>;

type InferZod<T> = T extends z.ZodTypeAny ? z.infer<T> : never;

export type PathsForMethod<M extends HttpMethod, Routes extends ApiRoutes> = {
	[P in keyof Routes]: M extends keyof Routes[P] ? P : never;
}[keyof Routes] &
	string;

export type RouteParams<M extends HttpMethod, P extends string, Routes extends ApiRoutes> =
	P extends keyof Routes
		? M extends keyof Routes[P]
			? Routes[P][M] extends RouteContract
				? InferZod<Routes[P][M]['params']>
				: never
			: never
		: never;

export type RouteQuery<M extends HttpMethod, P extends string, Routes extends ApiRoutes> =
	P extends keyof Routes
		? M extends keyof Routes[P]
			? Routes[P][M] extends RouteContract
				? InferZod<Routes[P][M]['query']>
				: never
			: never
		: never;

export type RouteBody<M extends HttpMethod, P extends string, Routes extends ApiRoutes> =
	P extends keyof Routes
		? M extends keyof Routes[P]
			? Routes[P][M] extends RouteContract
				? InferZod<Routes[P][M]['body']>
				: never
			: never
		: never;

export type RouteResponse<M extends HttpMethod, P extends string, Routes extends ApiRoutes> =
	P extends keyof Routes
		? M extends keyof Routes[P]
			? Routes[P][M] extends RouteContract
				? InferZod<Routes[P][M]['response']>
				: never
			: never
		: never;

export function defineRoutes<const T extends ApiRoutes>(routes: T): T & { __baseUrl: string } {
	const paths = Object.keys(routes);
	if (paths.length === 0) return { ...routes, __baseUrl: '/' };

	let baseUrl = paths[0]!;
	for (const p of paths.slice(1)) {
		while (!p.startsWith(baseUrl) && baseUrl.length > 1) {
			const lastSlash = baseUrl.lastIndexOf('/', baseUrl.length - 2);
			baseUrl = baseUrl.substring(0, lastSlash + 1);
		}
	}
	return { ...routes, __baseUrl: baseUrl };
}
