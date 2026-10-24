import { Project, SyntaxKind } from 'ts-morph';
import { describe, expect, it } from 'vitest';

import {
	extractAllowedChildren,
	extractContextNames,
	extractItemKeys,
	extractKnownKeys,
	extractMapSlots,
	extractProvidesContextFromProviderJsx,
	isReactNodeSlotType,
} from './entriesGenerator.js';

const project = () => new Project({ useInMemoryFileSystem: true, skipFileDependencyResolution: true });
const parse = (source: string) => project().createSourceFile('C.tsx', source);

describe('isReactNodeSlotType', () => {
	it.each([
		['ReactNode', true],
		['React.ReactNode', true],
		['ReactNode | undefined', true],
		['React.ReactNode | null', true],
		['ReactNode | null | undefined', true],
		['ReactNode | ((c: { id: string }) => ReactNode)', true],
		['ReactNode | ((a: Map<string, number>) => ReactNode)', true],
		['ReactNode | (() => ReactNode)', true],
		['ReactNode | ((a: string | number) => ReactNode)', true],
		['ReactNode | ((a: string) => ReactNode) | undefined', true],
		['ReactNode | ((a: string) => void)', true],
		['string | ReactNode', false],
		['ReactNode[]', false],
		['Array<ReactNode>', false],
		['ReactNode | Promise<string | number>', false],
		['(node: unknown) => ReactNode', false],
		['undefined', false],
		['', false],
	])('%j -> %s', (type, expected) => {
		expect(isReactNodeSlotType(type)).toBe(expected);
	});
});

describe('extractContextNames', () => {
	it('lists the contexts created in a source, with or without the React. prefix and a type argument', () => {
		const source = `
const A = React.createContext<string>('a');
const B = createContext(1);
export const C=createContext <number>(2);
const notAContext = something(3);
`;
		expect(extractContextNames(source, 'createContext')).toEqual(['A', 'B', 'C']);
	});

	it('lists the contexts consumed, deduplicated in order of first appearance, ignoring null and undefined', () => {
		const source = `
const a = useContext(ThemeCtx);
const b = React.useContext( FormCtx );
const c = useContext(ThemeCtx);
const d = useContext(null);
const e = useContext(undefined);
const f = useContext(some.member);
`;
		expect(extractContextNames(source, 'useContext')).toEqual(['ThemeCtx', 'FormCtx']);
	});

	it('returns nothing when there is no match, and keeps the two patterns apart', () => {
		expect(extractContextNames('const x = 1', 'createContext')).toEqual([]);
		expect(extractContextNames('const x = 1', 'useContext')).toEqual([]);
		expect(extractContextNames('const A = createContext(1)', 'useContext')).toEqual([]);
		expect(extractContextNames('useContext(A)', 'createContext')).toEqual([]);
	});

	it('deduplicates a context created twice', () => {
		expect(extractContextNames('const A = createContext(1); const A = createContext(2);', 'createContext')).toEqual(['A']);
	});
});

describe('extractProvidesContextFromProviderJsx', () => {
	const providersOf = (body: string) => {
		const fn = parse(`export function Host() { return (${body}); }`).getFunctionOrThrow('Host');
		return extractProvidesContextFromProviderJsx(fn);
	};

	it('finds opening and self-closing .Provider elements, once each', () => {
		expect(providersOf('<A.Provider value={1}><B.Provider value={2} /><A.Provider value={3}>x</A.Provider></A.Provider>')).toEqual(['A', 'B']);
	});

	it('ignores consumers, plain elements and nested member paths', () => {
		expect(providersOf('<A.Consumer>{() => null}</A.Consumer>')).toEqual([]);
		expect(providersOf('<div><span /></div>')).toEqual([]);
		expect(providersOf('<a.b.Provider value={1} />')).toEqual([]);
		expect(providersOf('<Provider value={1} />')).toEqual([]);
	});

	it('reads descendants of the function only', () => {
		const file = parse(`
export function Inner() { return <X.Provider value={1} />; }
export function Outer() { return <Y.Provider value={1}><Inner /></Y.Provider>; }
`);
		expect(extractProvidesContextFromProviderJsx(file.getFunctionOrThrow('Outer'))).toEqual(['Y']);
		expect(file.getFunctionOrThrow('Inner').getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)).toHaveLength(1);
	});
});

describe('extractKnownKeys edge cases', () => {
	const keysOf = (props: string, bind: string[] | null = null) => extractKnownKeys(parse(`export interface XProps {\n${props}\n}`), 'X', bind);

	it('keeps an aria-* prop but not a hyphenated or underscored name that is not valid JSX', () => {
		expect(keysOf("'aria-label'?: string; 'aria-describedby'?: string; 'x-custom'?: string; 'my_prop'?: string; 'data-id'?: string;")).toEqual([
			'aria-describedby',
			'aria-label',
		]);
	});

	it('drops className, style, ref and key, keeps similarly named props', () => {
		expect(keysOf('className?: string; style?: object; ref?: unknown; key?: string; classNames?: string; styled?: boolean;')).toEqual(['classNames', 'styled']);
	});

	it('keeps `value` and `onChange` of a component that is not bound', () => {
		expect(keysOf('value: string; onChange: () => void; label?: string;')).toEqual(['label', 'onChange', 'value']);
	});

	it('only treats the formData/onChange pattern as a bind', () => {
		const props = 'value: string; onChange: (v: string) => void; label?: string;';
		expect(keysOf(props, ['formData', 'onChange'])).toEqual(['bind', 'label']);
		expect(keysOf(props, ['formData', 'other'])).toEqual(['label', 'onChange', 'value']);
		expect(keysOf(props, ['other', 'onChange'])).toEqual(['label', 'onChange', 'value']);
		expect(keysOf(props, [])).toEqual(['label', 'onChange', 'value']);
	});

	it('removes `checked` from a toggle but not from a component that also has `value`', () => {
		const bind = ['formData', 'onChange'];
		expect(keysOf('checked: boolean; onChange: () => void; label?: string;', bind)).toEqual(['bind', 'label']);
		expect(keysOf('checked: boolean; value: string; onChange: () => void;', bind)).toEqual(['bind', 'checked']);
	});

	it('does not list a bind prop twice when the component declares it', () => {
		expect(keysOf('bind?: string; value: string; onChange: () => void;', ['formData', 'onChange'])).toEqual(['bind']);
	});

	it('lists a named ReactNode slot under its own name, and a render callback not at all', () => {
		expect(keysOf('footer?: React.ReactNode; renderRow?: (n: unknown, c: object) => React.ReactNode; onPick?: (id: string) => void;')).toEqual(['footer', 'onPick']);
	});

	it('returns the keys sorted', () => {
		expect(keysOf('zeta: string; alpha: string; mid: string;')).toEqual(['alpha', 'mid', 'zeta']);
	});

	it('falls back to items for a component with no Props interface, and ignores another component interface', () => {
		expect(extractKnownKeys(parse('export interface OtherProps { a: string }'), 'X', null)).toEqual(['items']);
	});
});

describe('extractAllowedChildren edge cases', () => {
	it('returns nothing without a Props interface, or when no prop has @slot', () => {
		expect(extractAllowedChildren(parse('export function X() { return null }'), 'X')).toEqual({});
		expect(extractAllowedChildren(parse('export interface XProps { a: string }'), 'X')).toEqual({});
	});

	it('splits the tags on commas, strips the tag: prefix and drops empty entries', () => {
		const source = 'export interface XProps {\n/** @slot tag:layout, tag:atomic,  display , */\nitems: unknown[];\n}';
		expect(extractAllowedChildren(parse(source), 'X')).toEqual({ items: ['layout', 'atomic', 'display'] });
	});

	it('ignores an empty @slot and other JSDoc tags', () => {
		const source = 'export interface XProps {\n/** @slot */\na: unknown[];\n/** @deprecated */\nb: unknown[];\n}';
		expect(extractAllowedChildren(parse(source), 'X')).toEqual({});
	});
});

describe('extractMapSlots edge cases', () => {
	const slotOf = (tag: string, type = 'Record<string, Entry>') =>
		extractMapSlots(parse(`interface Entry { view: unknown; label?: string; 'long-name'?: string }\nexport interface XProps {\n/** ${tag} */\nvariants: ${type};\n}`), 'X');

	it('derives the entry keys from the interface, unquoted, and keeps the order of declaration', () => {
		expect(slotOf('@mapSlot view')).toEqual({ variants: { keys: ['view', 'label', 'long-name'], nodeKey: 'view' } });
	});

	it('accepts spaces inside the Record type', () => {
		expect(slotOf('@mapSlot view', 'Record< string ,Entry >').variants!.nodeKey).toBe('view');
	});

	it('fails loudly, naming the prop, for every shape it cannot derive', () => {
		expect(() => slotOf('@mapSlot')).toThrow('[entriesGenerator] XProps.variants: @mapSlot needs the key holding the nested node, e.g. "@mapSlot view"');
		expect(() => slotOf('@mapSlot view', 'Map<string, Entry>')).toThrow('XProps.variants: @mapSlot needs the type "Record<string, SomeInterface>" with SomeInterface declared in the same file, got "Map<string, Entry>"');
		expect(() => slotOf('@mapSlot view', 'Record<string, Missing>')).toThrow(/declared in the same file/);
		expect(() => slotOf('@mapSlot nope')).toThrow('XProps.variants: @mapSlot key "nope" is not a property of Entry (view, label, long-name)');
	});
});

describe('extractItemKeys edge cases', () => {
	const specOf = (decls: string, tag = '@itemKeys A') => extractItemKeys(parse(`${decls}\nexport interface XProps {\n/** ${tag} */\ncolumns: unknown[];\n}`), 'X');

	it('rejects an interface that contains itself, through an array property, naming it', () => {
		expect(() => specOf('interface A { items?: A[] }')).toThrow('XProps.columns: @itemKeys interface "A" references itself');
		expect(() => specOf('interface A { items?: Array<A> }')).toThrow(/references itself/);
	});

	it('follows array properties typed T[] and Array<T>, but not a property typed with an unknown name', () => {
		expect(specOf('interface B { label: string }\ninterface A { field: string; one?: B[]; two?: Array<B>; three?: Missing[]; four?: string[] }')).toEqual({
			columns: { keys: ['field', 'one', 'two', 'three', 'four'], arrays: { one: { keys: ['label'] }, two: { keys: ['label'] } } },
		});
	});

	it('ignores an @itemKeys-less prop and a component with no Props interface', () => {
		expect(extractItemKeys(parse('export function X() { return null }'), 'X')).toEqual({});
		expect(extractItemKeys(parse('export interface XProps {\n/** @slot x */\ncolumns: unknown[];\n}'), 'X')).toEqual({});
	});

	it('separates typed variants from the default by the literal type of their `type` property, with either quote style', () => {
		const result = specOf(
			"interface A { field: string }\ninterface B { type: 'actions'; items: string[] }\ninterface C { type: \"badge\"; map: object }",
			'@itemKeys A, B, C'
		);
		expect(Object.keys(result['columns']!.byType!)).toEqual(['actions', 'badge']);
		expect(result['columns']!.keys).toEqual(['field']);
	});

	it('treats a non-literal `type` property as part of the default item', () => {
		const result = specOf('interface A { type?: string; field: string }');
		expect(result['columns']).toEqual({ keys: ['type', 'field'] });
	});

	it('trims the interface names and ignores empty entries', () => {
		expect(specOf('interface A { a: string }\ninterface B { type: \'t\'; b: string }', '@itemKeys  A ,, B ,').columns).toMatchObject({ keys: ['a'], byType: { t: { keys: ['type', 'b'] } } });
	});
});
