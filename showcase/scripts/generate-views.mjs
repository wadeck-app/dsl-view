// Generates src/dsl-views/components-<group>.yaml: one frame per dsl-ui registry component, with controls derived from the
// component's shipped Zod node schema. Run: node scripts/generate-views.mjs (from this folder, after building dsl-ui).
// Output is committed; `generate-views.test.mjs` regenerates in memory and fails when a committed view is stale.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODULE_DIR = path.resolve(HERE, '../app-module-showcase');
const INVENTORY = path.resolve(HERE, '../../.claude/docs/inventory.md');
const VIEWS_DIR = path.join(MODULE_DIR, 'src/dsl-views');
const SAMPLES_FILE = path.join(HERE, 'samples.json');

function fail(message) {
	throw new Error(`generate-views: ${message}`);
}

/** Rows of inventory.md under "## Registry components", with the folder group of their "### " heading. */
export function parseInventory(markdown) {
	const start = markdown.indexOf('## Registry components');
	if (start < 0) {
		fail(`"## Registry components" not found in ${INVENTORY}`);
	}
	const rows = [];
	let group = null;
	for (const line of markdown.slice(start).split('\n')) {
		if (line.startsWith('### ')) {
			group = line.slice(4).trim();
			continue;
		}
		if (line.startsWith('## ') && !line.startsWith('## Registry')) {
			break;
		}
		const m = /^\| `([A-Z]\w+)` \| (\w+) \| ([^|]*)\| (.*) \|\s*$/.exec(line);
		if (m && group && group !== 'React API (not DSL nodes)') {
			rows.push({ name: m[1], group, category: m[2], keyProps: m[3].trim(), description: m[4].trim() });
		}
	}
	return rows;
}

/** What a prop accepts, read from its Zod 4 schema: scalar kinds become controls, the rest is described only. */
export function describeProp(schema) {
	let s = schema;
	let optional = false;
	for (let i = 0; i < 8; i++) {
		const def = s._zod.def;
		if (def.type === 'optional' || def.type === 'nullable' || def.type === 'default') {
			optional = true;
			s = def.innerType;
		} else if (def.type === 'union') {
			// `dsl(z.X)` is union([X, expression string]): the literal form is the first option.
			s = def.options[0];
		} else {
			break;
		}
	}
	const def = s._zod.def;
	if (def.type === 'enum') {
		return { kind: 'enum', values: Object.values(def.entries), optional };
	}
	if (['boolean', 'number', 'string'].includes(def.type)) {
		return { kind: def.type, optional };
	}
	return { kind: 'other', type: def.type, optional };
}

const SKIPPED_KEYS = new Set(['className', 'style']);

function loadSchemas() {
	const file = path.resolve(HERE, '../../packages/dsl-ui/dist/schemas/generated-node-schemas.js');
	if (!fs.existsSync(file)) {
		fail(`${file} is missing: build dsl-ui first (npm run build in packages/dsl-ui).`);
	}
	// A dist older than its source describes props that no longer match: the committed views would then differ from what
	// CI (which builds first) generates. Say so instead of writing wrong views.
	const source = path.resolve(HERE, '../../packages/dsl-ui/src/schemas/generated-node-schemas.ts');
	if (fs.statSync(file).mtimeMs < fs.statSync(source).mtimeMs) {
		fail(`${file} is older than ${source}: rebuild dsl-ui first (npm run build in packages/dsl-ui).`);
	}
	return import(`file:///${file.replace(/\\/g, '/')}`);
}

/** Tiny block-style YAML writer for the plain data this generator produces. */
export function toYaml(value, indent = 0) {
	const pad = '  '.repeat(indent);
	if (Array.isArray(value)) {
		if (value.length === 0) {
			return '[]';
		}
		return value
			.map(item => {
				const text = toYaml(item, indent + 1);
				return isBlock(item) ? `${pad}- ${text.trimStart()}` : `${pad}- ${text}`;
			})
			.join('\n');
	}
	if (value && typeof value === 'object') {
		const entries = Object.entries(value);
		if (entries.length === 0) {
			return '{}';
		}
		return entries
			.map(([k, v]) => {
				if (isBlock(v)) {
					return `${pad}${k}:\n${toYaml(v, indent + 1)}`;
				}
				return `${pad}${k}: ${toYaml(v, indent + 1)}`;
			})
			.join('\n');
	}
	return JSON.stringify(value);
}

function isBlock(v) {
	return (Array.isArray(v) && v.length > 0) || (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0);
}

function varName(component, prop) {
	return `${component}__${prop}`;
}

function defaultFor(component, prop, kind, values, samples) {
	const given = samples[component]?.defaults?.[prop];
	if (given !== undefined) {
		return given;
	}
	if (kind === 'enum') {
		return values[0];
	}
	if (kind === 'boolean') {
		return false;
	}
	if (kind === 'number') {
		return 1;
	}
	return ['label', 'title', 'text', 'name', 'placeholder'].includes(prop) ? component : 'sample';
}

function controlFor(component, prop, info) {
	const bind = varName(component, prop);
	if (info.kind === 'boolean') {
		return { $type: 'Switch', label: prop, bind };
	}
	if (info.kind === 'enum') {
		return { $type: 'FieldSelect', label: prop, bind, options: info.values.map(v => ({ value: v, label: v })) };
	}
	if (info.kind === 'number') {
		return { $type: 'FieldNumber', label: prop, bind };
	}
	return { $type: 'FieldText', label: prop, bind };
}

function propsTable(props) {
	const lines = ['| Prop | Type | Required |', '|---|---|---|'];
	for (const [name, info] of props) {
		const type = info.kind === 'enum' ? info.values.join(' / ') : info.kind === 'other' ? info.type : info.kind;
		lines.push(`| \`${name}\` | ${type} | ${info.optional ? 'no' : 'yes'} |`);
	}
	return lines.join('\n');
}

/** One frame: named header, description, controls, the live node, the props table. Returns the frame and the vars it seeds. */
export function buildFrame(row, schemaShape, samples) {
	const props = Object.entries(schemaShape)
		.filter(([key]) => !key.startsWith('$') && !SKIPPED_KEYS.has(key))
		.map(([key, schema]) => [key, describeProp(schema)]);
	const sample = samples[row.name] ?? {};
	const literal = sample.props ?? {};
	// An optional free string or number has no safe starting value (a made-up `href` turns a Badge into a link), so it is
	// left unset unless samples.json lists it under `controls`. Enums and booleans start at their first value.
	const controlled = props.filter(
		([key, info]) =>
			info.kind !== 'other' &&
			!(key in literal) &&
			(!info.optional || info.kind === 'enum' || info.kind === 'boolean' || (sample.controls ?? []).includes(key))
	);
	const missing = props.filter(([key, info]) => info.kind === 'other' && !info.optional && !(key in literal));
	const vars = {};
	const node = { $type: row.name, ...literal };
	const controls = [];
	for (const [key, info] of controlled) {
		const name = varName(row.name, key);
		vars[name] = defaultFor(row.name, key, info.kind, info.values, samples);
		node[key] = `$vars.${name}`;
		controls.push(controlFor(row.name, key, info));
	}
	const playable = missing.length === 0 && sample.skip !== true;
	const body = [{ $type: 'Markdown', text: row.description }];
	if (controls.length > 0 && playable) {
		body.push({ $type: 'HorizontalStack', wrap: true, items: controls });
	}
	if (playable) {
		body.push(sample.wrap ? { ...sample.wrap, items: [node] } : node);
	} else {
		const why = sample.skip === true ? 'marked not playable in samples.json' : `required props without a sample: ${missing.map(([k]) => k).join(', ')}`;
		body.push({ $type: 'Markdown', text: `_Not playable yet (${why})._` });
	}
	body.push({ $type: 'Markdown', text: propsTable(props) });
	const frame = {
		$type: 'Card',
		header: [
			{ $type: 'Tag', label: row.name },
			{ $type: 'Tag', label: row.category },
			{ $type: 'Tag', label: row.group },
		],
		items: body,
	};
	return { frame, vars, playable };
}

export async function generate() {
	const rows = parseInventory(fs.readFileSync(INVENTORY, 'utf8'));
	const samples = fs.existsSync(SAMPLES_FILE) ? JSON.parse(fs.readFileSync(SAMPLES_FILE, 'utf8')) : {};
	const schemas = await loadSchemas();
	const files = new Map();
	const report = { playable: [], described: [], noSchema: [] };
	const byGroup = new Map();
	for (const row of rows) {
		byGroup.set(row.group, [...(byGroup.get(row.group) ?? []), row]);
	}
	for (const [group, groupRows] of byGroup) {
		const vars = {};
		const frames = [];
		for (const row of groupRows) {
			const schema = schemas[`${row.name}NodeSchema`];
			if (!schema) {
				report.noSchema.push(row.name);
				frames.push({
					$type: 'Card',
					header: [{ $type: 'Tag', label: row.name }, { $type: 'Tag', label: row.category }, { $type: 'Tag', label: row.group }],
					items: [
						{ $type: 'Markdown', text: row.description },
						{ $type: 'Markdown', text: `_No node schema shipped for ${row.name}: no controls, no live render yet._` },
					],
				});
				continue;
			}
			const built = buildFrame(row, schema.shape, samples);
			Object.assign(vars, built.vars);
			frames.push(built.frame);
			(built.playable ? report.playable : report.described).push(row.name);
		}
		const page = {
			$vars: vars,
			$type: 'VerticalStack',
			items: [{ $type: 'PageHeader', title: `Components: ${group}`, subtitle: `${groupRows.length} components, generated by scripts/generate-views.mjs from inventory.md and the node schemas` }, ...frames],
		};
		const header = '# GENERATED by scripts/generate-views.mjs, do not edit. Change samples.json or the generator, then regenerate.\n';
		const { $vars, ...rest } = page;
		files.set(`components-${group}.yaml`, `${header}$vars:\n${Object.keys($vars).length ? toYaml($vars, 1) : '  {}'}\n\n${toYaml(rest)}\n`);
	}
	return { files, report };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const { files, report } = await generate();
	for (const [name, content] of files) {
		fs.writeFileSync(path.join(VIEWS_DIR, name), content);
	}
	console.log(`✓ wrote ${files.size} views: ${report.playable.length} playable, ${report.described.length} described only, ${report.noSchema.length} without a schema`);
	if (report.noSchema.length > 0) {
		console.log(`  no node schema: ${report.noSchema.join(', ')}`);
	}
}
