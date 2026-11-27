// The constraints a component declares (`@slot tag:x` on its slots, a context it needs) block the build when a page breaks them:
// they used to be metadata that nothing checked, so a button placed in a slot of fields rendered with no complaint.
import { describe, expect, it } from 'vitest';

import { buildKnownKeysManifest, findUnknownKeys } from './unknownKeys.js';
import type { DslKeysManifest } from './unknownKeys.js';

const manifest: DslKeysManifest = {
	Form: { knownKeys: ['fields', 'actions'], allowedChildren: { fields: ['field'], actions: ['action-bar', 'form-specific'] }, category: 'composite', tags: ['form'], providesContext: ['FormContext'] },
	VerticalStack: { knownKeys: ['items'], allowedChildren: { items: ['layout', 'atomic', 'composite'] }, category: 'disposition', tags: ['layout'] },
	FieldText: { knownKeys: ['label'], category: 'atomic', tags: ['field'] },
	ButtonAction: { knownKeys: ['label'], category: 'atomic', tags: ['button', 'action'] },
	ButtonSave: { knownKeys: ['label'], category: 'atomic', tags: ['button'], requiresContext: ['FormContext'] },
	ThemePicker: { knownKeys: [], category: 'atomic', tags: [], requiresContext: ['ThemeContext'] },
	Handwritten: { knownKeys: [] },
};

const codes = (doc: Record<string, unknown>) => findUnknownKeys(doc, manifest).map(d => `${d.code}@${d.nodePath}`);

describe('slot tag constraint', () => {
	it('is an error naming the child, the slot, what the slot allows and what the child is', () => {
		const diagnostics = findUnknownKeys({ $type: 'Form', fields: [{ $type: 'ButtonAction', label: 'Go' }] }, manifest);
		expect(diagnostics).toEqual([
			expect.objectContaining({
				severity: 'error',
				code: 'slot-tag-mismatch',
				type: 'ButtonAction',
				nodePath: '$.fields[0]',
				message: expect.stringContaining('[ButtonAction] is not allowed'),
			}),
		]);
		expect(diagnostics[0]!.message).toContain('"fields"');
		expect(diagnostics[0]!.message).toContain('field');
		expect(diagnostics[0]!.message).toContain('button, action');
	});

	it('accepts a child that carries one of the allowed tags', () => {
		expect(codes({ $type: 'Form', fields: [{ $type: 'FieldText', label: 'Name' }] })).toEqual([]);
	});

	it('accepts a child whose category is the allowed tag (a slot of atomic components)', () => {
		expect(codes({ $type: 'VerticalStack', items: [{ $type: 'ButtonAction', label: 'Go' }] })).toEqual([]);
	});

	it('reports every offender of a slot, not only the first', () => {
		expect(
			codes({ $type: 'Form', fields: [{ $type: 'ButtonAction', label: 'a' }, { $type: 'FieldText', label: 'b' }, { $type: 'ButtonAction', label: 'c' }] })
		).toEqual(['slot-tag-mismatch@$.fields[0]', 'slot-tag-mismatch@$.fields[2]']);
	});

	it('still checks what is inside a mismatched child', () => {
		const diagnostics = findUnknownKeys({ $type: 'Form', fields: [{ $type: 'ButtonAction', label: 'a', colour: 'red' }] }, manifest);
		expect(diagnostics.map(d => d.code).sort()).toEqual(['slot-tag-mismatch', 'unknown-key']);
	});

	it('does not judge a child whose entry carries no category or tags (a hand-written entry, an old manifest)', () => {
		expect(codes({ $type: 'Form', fields: [{ $type: 'Handwritten' }] })).toEqual([]);
	});

	it('does not judge a slot that declares no tags', () => {
		const open: DslKeysManifest = { ...manifest, VerticalStack: { knownKeys: ['items'], allowedChildren: { items: [] }, category: 'disposition', tags: [] } };
		expect(findUnknownKeys({ $type: 'VerticalStack', items: [{ $type: 'ButtonAction', label: 'x' }] }, open)).toEqual([]);
	});

	it('an expression bound at runtime is not judged', () => {
		expect(codes({ $type: 'Form', fields: '$sources.fields' })).toEqual([]);
	});
});

describe('required context constraint', () => {
	it('is a warning (never blocks) when a component needs a context that a registry component provides and no ancestor does', () => {
		const diagnostics = findUnknownKeys({ $type: 'VerticalStack', items: [{ $type: 'ButtonSave', label: 'Save' }] }, manifest);
		expect(diagnostics).toEqual([
			expect.objectContaining({
				severity: 'warning',
				code: 'missing-context',
				type: 'ButtonSave',
				nodePath: '$.items[0]',
				message: expect.stringContaining('FormContext'),
			}),
		]);
		expect(diagnostics[0]!.message).toContain('Form');
	});

	it('is fine under the component that provides it, however deep', () => {
		expect(
			codes({ $type: 'Form', actions: [{ $type: 'ButtonSave', label: 'Save' }] })
		).not.toContain('missing-context@$.actions[0]');
		const deep: DslKeysManifest = { ...manifest, Form: { ...manifest.Form!, allowedChildren: { fields: ['field', 'layout'], actions: ['button'] } } };
		const doc = { $type: 'Form', fields: [{ $type: 'VerticalStack', items: [{ $type: 'ButtonSave', label: 'Save' }] }] };
		expect(findUnknownKeys(doc, deep).filter(d => d.code === 'missing-context')).toEqual([]);
	});

	it('a context that no registry component provides comes from the app, and is not flagged', () => {
		expect(codes({ $type: 'VerticalStack', items: [{ $type: 'ThemePicker' }] })).toEqual([]);
	});

	it('a sibling of the provider does not borrow its context', () => {
		const doc = { $type: 'VerticalStack', items: [{ $type: 'Form', fields: [] }, { $type: 'ButtonSave', label: 'Save' }] };
		expect(codes(doc)).toEqual(['missing-context@$.items[1]']);
	});
});

describe('buildKnownKeysManifest carries the constraints', () => {
	it('keeps category, tags and the contexts, and omits the empty ones', () => {
		const built = buildKnownKeysManifest([
			{ name: 'ButtonSave', knownKeys: ['label'], category: 'atomic', tags: ['button'], requiresContext: ['FormContext'] },
			{ name: 'Form', knownKeys: [], category: 'composite', tags: [], providesContext: ['FormContext'] },
			{ name: 'Plain', knownKeys: [], category: 'atomic', tags: [], requiresContext: [], providesContext: [] },
		]);
		expect(built['ButtonSave']).toEqual({ knownKeys: ['label'], category: 'atomic', tags: ['button'], requiresContext: ['FormContext'] });
		expect(built['Form']).toEqual({ knownKeys: [], category: 'composite', providesContext: ['FormContext'] });
		expect(built['Plain']).toEqual({ knownKeys: [], category: 'atomic' });
	});
});

describe('placement mode (progressive migration of existing app modules)', () => {
	const misplaced = { $type: 'Form', fields: [{ $type: 'ButtonAction', label: 'Go' }] };

	it('blocks by default', () => {
		expect(findUnknownKeys(misplaced, manifest).map(d => d.severity)).toEqual(['error']);
	});

	it('placement "warning" reports the same finding as a warning that says it will block later', () => {
		const diagnostics = findUnknownKeys(misplaced, manifest, { placement: 'warning' });
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]).toMatchObject({ severity: 'warning', code: 'slot-tag-mismatch', nodePath: '$.fields[0]' });
		expect(diagnostics[0]!.message).toContain('will become an error');
	});

	it('placement "error" is the explicit spelling of the default', () => {
		expect(findUnknownKeys(misplaced, manifest, { placement: 'error' })[0]!.severity).toBe('error');
	});

	it('does not soften any other check', () => {
		const diagnostics = findUnknownKeys({ $type: 'Form', fields: [{ $type: 'FieldText', label: 'a', colour: 'red' }] }, manifest, { placement: 'warning' });
		expect(diagnostics.map(d => [d.code, d.severity])).toEqual([['unknown-key', 'error']]);
	});
});

describe('context rule scope', () => {
	it('providedContexts: the app says which contexts its shell provides, and they are not flagged', () => {
		const doc = { $type: 'VerticalStack', items: [{ $type: 'ButtonSave', label: 'Save' }] };
		expect(findUnknownKeys(doc, manifest).map(d => d.code)).toEqual(['missing-context']);
		expect(findUnknownKeys(doc, manifest, { providedContexts: ['FormContext'] })).toEqual([]);
	});

	it('a provider that has no slot for nodes is an app-level provider (RouterProvider), never expected in a view', () => {
		const withRouter: DslKeysManifest = {
			...manifest,
			RouterProvider: { knownKeys: [], category: 'disposition', tags: [], providesContext: ['RouterContext'] },
			DataTable: { knownKeys: [], category: 'composite', tags: ['table'], requiresContext: ['RouterContext'] },
		};
		expect(findUnknownKeys({ $type: 'DataTable' }, withRouter)).toEqual([]);
	});

	it('a component that provides the context it needs itself (nested AbTest) is not flagged', () => {
		const ab: DslKeysManifest = {
			...manifest,
			AbTest: { knownKeys: ['variants'], mapSlots: { variants: { keys: ['view'], nodeKey: 'view' } }, category: 'composite', tags: [], providesContext: ['AbParentContext'], requiresContext: ['AbParentContext'] },
		};
		expect(findUnknownKeys({ $type: 'AbTest' }, ab)).toEqual([]);
	});
});
