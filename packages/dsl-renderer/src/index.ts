// violations-suppress: ts/no-barrel-index npm package public API entry point - necessary for published package consumers
// violations-suppress-start: ts/no-export-star published package barrel uses export* intentionally
export { defineRoutes } from './routeBuilder.js';
export type { HttpMethod, RouteContract, PathRoutes, ApiRoutes, PathsForMethod, RouteParams, RouteQuery, RouteBody, RouteResponse } from './routeBuilder.js';
export { DslRenderer, renderChildren, resolveExpressionValue } from './engine/DslRenderer.js';
export type { RenderContext, RendererProps } from './engine/DslRenderer.js';
export { createRegistry } from './ComponentRegistry.js';
export type { ComponentRegistry, ComponentRegistryEntry, RegistryRenderProps } from './ComponentRegistry.js';
export { GenericPageRunner } from './GenericPageRunner.js';
export type { GenericPageRunnerProps } from './GenericPageRunner.js';
export type { Fetcher } from './pageRunner/pageRunnerUtils.js';
