import { render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearColumnFormats, getColumnFormat, registerColumnFormat, registeredColumnFormatNames } from './columnFormats.js';
import { DataTable } from './DataTable.js';

type Row = { id: string; status: number; method: string };
const rows: Row[] = [
	{ id: '1', status: 200, method: 'GET' },
	{ id: '2', status: 404, method: 'POST' },
];

beforeEach(() => {
	clearColumnFormats();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('registerColumnFormat', () => {
	it('renders a YAML column whose format the app registered, with the value and the whole row', () => {
		const renderer = vi.fn((value: unknown, row: Record<string, unknown>) => <b data-testid="swatch">{`${String(value)}@${String(row['id'])}`}</b>);
		registerColumnFormat('httpStatus', renderer);

		render(<DataTable rows={rows} columns={[{ field: 'status', label: 'Status', format: 'httpStatus' }] as never} />);

		expect(screen.getAllByTestId('swatch').map(node => node.textContent)).toEqual(['200@1', '404@2']);
		expect(renderer).toHaveBeenCalledWith(200, rows[0]);
	});

	it('replaces a previous renderer registered under the same name (hot reload re-runs the app module)', () => {
		registerColumnFormat('tone', () => 'first');
		registerColumnFormat('tone', () => 'second');

		render(<DataTable rows={[rows[0]!]} columns={[{ field: 'method', format: 'tone' }] as never} />);

		expect(screen.getByRole('cell')).toHaveTextContent('second');
		expect(registeredColumnFormatNames()).toEqual(['tone']);
	});

	it('an unregistered format stays a plain value and the warning names the built-in AND the registered formats', () => {
		const reportError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		registerColumnFormat('zeta', () => 'z');
		registerColumnFormat('alpha', () => 'a');

		render(<DataTable rows={[rows[0]!]} columns={[{ field: 'method', label: 'Method', format: 'httpMethod' }] as never} />);

		expect(screen.getByRole('cell')).toHaveTextContent('GET');
		const message = reportError.mock.calls.map(call => String(call[0])).find(text => text.includes('unknown format "httpMethod"'));
		expect(message).toContain('Supported formats: datetime, date, time, bytes, ms, alpha, zeta.');
		expect(message).toContain('registerColumnFormat');
	});

	it('a built-in format keeps its own rendering when the app registers other names', () => {
		registerColumnFormat('httpStatus', () => 'custom');

		render(<DataTable rows={[{ id: '1', size: 2048 }] as never} columns={[{ field: 'size', label: 'Size', format: 'bytes' }] as never} />);

		expect(screen.getByRole('cell')).toHaveTextContent('2.0 KB');
	});

	it.each(['datetime', 'date', 'time', 'bytes', 'ms'])('refuses to shadow the built-in "%s" format', name => {
		expect(() => registerColumnFormat(name, () => 'x')).toThrow(`"${name}" is a built-in format`);
		expect(getColumnFormat(name)).toBeUndefined();
	});

	it.each(['', '1abc', 'has space', 'dot.name'])('refuses the malformed name %j', name => {
		expect(() => registerColumnFormat(name, () => 'x')).toThrow('invalid format name');
		expect(registeredColumnFormatNames()).toEqual([]);
	});

	it('refuses a renderer that is not a function, naming the format', () => {
		expect(() => registerColumnFormat('tone', 'nope' as never)).toThrow('the renderer of "tone" must be a function');
	});
});
