import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const script = path.resolve(here, '../../scripts/generate-node-schemas.ts');
const committed = path.resolve(here, 'generated-node-schemas.ts');

function runGenerator(args: string[]): string {
	// Node runs the .ts script directly (type stripping); stderr is captured so a failure shows its message.
	return execFileSync(process.execPath, [script, ...args], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
}

// The generator itself is the code under test here: regenerating must reproduce the committed file byte for byte,
// so a change to a mapping rule without a regeneration (or a hand edit of the generated file) fails loudly.
describe('scripts/generate-node-schemas.ts', () => {
	it('regenerates exactly the committed schemas (run `npm run generate-node-schemas` otherwise)', () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'node-schemas-'));
		try {
			const out = path.join(dir, 'generated.ts');
			const log = runGenerator(['--out', out]);
			expect(log).toMatch(/\[ok\] Generated generated-node-schemas\.ts with \d+ schemas/);
			expect(fs.readFileSync(out, 'utf-8')).toBe(fs.readFileSync(committed, 'utf-8'));
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
		// ts-morph parses every component: ~10s locally, give slower CI machines room.
	}, 180_000);

	it('reports the schema count it generated', () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'node-schemas-'));
		try {
			const out = path.join(dir, 'generated.ts');
			const count = Number(/with (\d+) schemas/.exec(runGenerator(['--out', out]))?.[1]);
			const exported = (fs.readFileSync(out, 'utf-8').match(/^export const \w+NodeSchema = /gm) ?? []).length;
			expect(count).toBeGreaterThan(40);
			expect(exported).toBe(count);
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	}, 180_000);

	it('fails with an actionable message when --out has no path', () => {
		expect(() => runGenerator(['--out'])).toThrow(/--out needs a path/);
	}, 60_000);
});
