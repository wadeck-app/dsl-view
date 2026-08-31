// Type declaration stubs for packages that lack bundled type definitions.
// These provide minimal typings to satisfy TypeScript while skipLibCheck=true
// handles the rest.

declare module 'js-yaml' {
	export function load(content: string): unknown;
	export function dump(obj: unknown): string;
}
