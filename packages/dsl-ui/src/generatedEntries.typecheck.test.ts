import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const packagesDir = path.resolve(here, '../..');
// Workspace build of the renderer (see scripts/generate-known-keys.ts for why not node_modules).
const generatorPath = path.resolve(packagesDir, 'dsl-renderer/dist/build/entriesGenerator.js');

describe('generated entries.tsx for the real dsl-ui components', () => {
	// The page's first-load flag must reach the components that show a loading state, otherwise a table reads
	// "No items" before its data has arrived. Guards the @ctxDefault $initialLoading tags.
	it('defaults DataTable.loading and StatTile.loading to the page ctx $initialLoading', async () => {
		if (!fs.existsSync(generatorPath)) {
			throw new Error(`dsl-renderer is not built (${generatorPath} missing): run \`npm run build\` in packages/dsl-renderer first.`);
		}
		const { buildEntriesFile } = await import(/* @vite-ignore */ generatorPath);
		const appRoot = path.join(packagesDir, '__entries-typecheck-app');
		const content: string = buildEntriesFile(appRoot, [{ pkg: 'dsl-ui', absDir: path.join(packagesDir, 'dsl-ui/src/components') }]);
		for (const props of ['DataTableProps', 'StatTileProps']) {
			const lines = content.split('\n').filter((line) => line.includes("node['loading']") && line.includes(`/${props.replace('Props', '')}.js`));
			expect(lines, `no generated loading declaration for ${props}`).toHaveLength(1);
			expect(lines[0]).toContain("?? ctx['$initialLoading']");
		}
		const refreshing = content.split('\n').filter((line) => line.includes("node['refreshing']"));
		expect(refreshing).toHaveLength(1);
		expect(refreshing[0]).toContain("?? ctx['$refreshing']");
		const refresh = content.split('\n').filter((line) => line.includes("node['onRefresh']"));
		expect(refresh).toHaveLength(1);
		expect(refresh[0]).toContain("?? ctx['$refresh']");
		// Generating entries for every component takes ~60 s under a loaded machine (same budget as the typecheck below).
	}, 300_000);

	// Regression: an AbTest render-node prop emitted `registry` without destructuring it, and nothing
	// typechecked the generated file, so the broken output was published. Compile it with the strictest
	// flags a consumer may use (noUnusedLocals / noUnusedParameters) so any generator output error fails here.
	it('typechecks under strict, noUnusedLocals and noUnusedParameters', async () => {
		if (!fs.existsSync(generatorPath)) {
			throw new Error(`dsl-renderer is not built (${generatorPath} missing): run \`npm run build\` in packages/dsl-renderer first.`);
		}
		const { buildEntriesFile } = await import(/* @vite-ignore */ generatorPath);

		// Virtual app root: the generated relative imports (../../../dsl-ui/src, ../../../dsl-renderer/src)
		// resolve from <appRoot>/src/generated to packages/, so the file never exists on disk.
		const appRoot = path.join(packagesDir, '__entries-typecheck-app');
		const entriesPath = path.join(appRoot, 'src/generated/entries.tsx');
		const content: string = buildEntriesFile(appRoot, [{ pkg: 'dsl-ui', absDir: path.join(packagesDir, 'dsl-ui/src/components') }]);

		const options: ts.CompilerOptions = {
			target: ts.ScriptTarget.ES2022,
			lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
			module: ts.ModuleKind.ESNext,
			moduleResolution: ts.ModuleResolutionKind.Bundler,
			jsx: ts.JsxEmit.ReactJSX,
			strict: true,
			noUnusedLocals: true,
			noUnusedParameters: true,
			skipLibCheck: true,
			noEmit: true,
			// Same ambient types as the dsl-ui build, resolved from this package.
			types: [],
			typeRoots: [path.join(packagesDir, '../node_modules/@types')],
		};
		const host = ts.createCompilerHost(options);
		const normalized = (file: string) => path.resolve(file).toLowerCase();
		const virtual = normalized(entriesPath);
		const originalGetSourceFile = host.getSourceFile.bind(host);
		const originalFileExists = host.fileExists.bind(host);
		const originalReadFile = host.readFile.bind(host);
		host.getSourceFile = (fileName, languageVersion, ...rest) =>
			normalized(fileName) === virtual
				? ts.createSourceFile(fileName, content, languageVersion, true, ts.ScriptKind.TSX)
				: originalGetSourceFile(fileName, languageVersion, ...rest);
		host.fileExists = (fileName) => normalized(fileName) === virtual || originalFileExists(fileName);
		host.readFile = (fileName) => (normalized(fileName) === virtual ? content : originalReadFile(fileName));

		const program = ts.createProgram([entriesPath], options, host);
		const diagnostics = ts
			.getPreEmitDiagnostics(program)
			.filter((d) => d.file !== undefined && normalized(d.file.fileName) === virtual);
		const report = diagnostics.map((d) => {
			const { line } = d.file!.getLineAndCharacterOfPosition(d.start ?? 0);
			return `entries.tsx(${line + 1}): TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`;
		});
		expect(report).toEqual([]);
		// Whole dsl-ui import graph is typechecked: ~20-40s locally, give slower CI machines room.
	}, 300_000);
});
