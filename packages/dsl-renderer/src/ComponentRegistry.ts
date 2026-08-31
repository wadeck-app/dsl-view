import type React from 'react';
import type { z } from 'zod';

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
	ctxSchema?: z.ZodSchema;
	render: (props: RegistryRenderProps) => React.ReactElement | null;
	// Constraint metadata - populated by entriesGenerator from JSDoc @slot tags and createContext/useContext calls
	allowedChildren?: Record<string, string[]>; // slotName → allowed tags (e.g. { fields: ['field'], actions: ['action-bar'] })
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
