import type { z } from 'zod';

/**
 * The generated entries call this with the namespace of a library's `schemas/generated-node-schemas` module: the schema of
 * component `Name` is its `NameNodeSchema` export. Outside development it returns nothing, so a production build of an
 * app keeps neither the lookup nor (once the bundler drops the unused import) the schemas.
 */
export function pickPropSchema(schemas: Record<string, unknown>, name: string, development: boolean): z.ZodSchema | undefined {
	return development ? (schemas[`${name}NodeSchema`] as z.ZodSchema | undefined) : undefined;
}
