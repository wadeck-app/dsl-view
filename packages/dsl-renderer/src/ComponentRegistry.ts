import type React from 'react';
import type { z } from 'zod';

import type { ItemKeysSpec, MapSlotSpec } from './dslKeys.js';

export interface RegistryRenderProps {
	node: Record<string, unknown>;
	registry: ComponentRegistry;
	ctx: Record<string, unknown>;
}

export interface ComponentRegistryEntry {
	name: string;
	category: 'atomic' | 'disposition' | 'composite';
	tags: string[];
	nodeSchema?: z.ZodSchema;
	// Per-prop schema of an authored node (an object schema whose `shape` holds one schema per prop), expression-tolerant:
	// a prop may hold `$sources.x`. Used by DslRenderer in development to WARN about a resolved value of the wrong shape
	// (never to change what renders, unlike nodeSchema). Filled by entriesGenerator when the library ships
	// `schemas/generated-node-schemas`; absent = the props of that component are not checked.
	propSchema?: z.ZodSchema;
	ctxSchema?: z.ZodSchema;
	render: (props: RegistryRenderProps) => React.ReactElement | null;
	// Constraint metadata - populated by entriesGenerator from JSDoc @slot tags and createContext/useContext calls
	allowedChildren?: Record<string, string[]>; // slotName -> allowed tags (e.g. { fields: ['field'], actions: ['action-bar'] })
	// Non-directive DSL keys the generated render actually reads (props, `bind`, and `items` for a ReactNode `children` prop).
	// Absent = unknown (hand-written entry): the build-time compiler reports it as "unchecked" instead of skipping silently.
	knownKeys?: string[];
	// Props holding a map of named entries that each carry a nested DSL node (see MapSlotSpec), e.g. AbTest `variants`.
	mapSlots?: Record<string, MapSlotSpec>;
	// Props holding an array of plain objects authored in YAML (see ItemKeysSpec), e.g. DataTable `columns`.
	itemKeys?: Record<string, ItemKeysSpec>;
	providesContext?: string[]; // context variable names provided (from createContext() calls)
	requiresContext?: string[]; // context variable names required (from useContext() calls)
}

export type ComponentRegistry = Record<string, ComponentRegistryEntry>;

export function createRegistry(entries: ComponentRegistryEntry[]): ComponentRegistry {
	const registry: ComponentRegistry = {};
	for (const entry of entries) {
		registry[entry.name] = entry;
	}
	return registry;
}
