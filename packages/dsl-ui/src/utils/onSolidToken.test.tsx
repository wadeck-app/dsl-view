import { render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Badge } from '@dsl-ui/components/display/Badge.js';
import { Button } from '@dsl-ui/components/controls/_Button.js';
import { warnMissingOnSolidToken } from '@dsl-ui/utils/onSolidToken.js';

// test-setup.ts defines the token on the root element so the other suites stay quiet; these tests take it away.
const root = document.documentElement;
let saved: string;

beforeEach(() => {
	saved = root.style.getPropertyValue('--color-on-solid');
});
afterEach(() => {
	root.style.setProperty('--color-on-solid', saved);
	vi.restoreAllMocks();
});

describe('warnMissingOnSolidToken', () => {
	it('reports once, naming the token and the fix, when the token is not defined', () => {
		root.style.removeProperty('--color-on-solid');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		warnMissingOnSolidToken();
		warnMissingOnSolidToken();

		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0][0]).toContain('--color-on-solid');
		expect(warn.mock.calls[0][0]).toContain('theme.css');
		expect(warn.mock.calls[0][0]).toContain('white');
	});

	it('stays silent when the token is defined', () => {
		root.style.setProperty('--color-on-solid', '#ffffff');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		warnMissingOnSolidToken();

		expect(warn).not.toHaveBeenCalled();
	});

	it('is reported by a solid Badge and a danger Button, and not by a plain Button', () => {
		root.style.removeProperty('--color-on-solid');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		render(<Button variant="primary">ok</Button>);
		expect(warn).not.toHaveBeenCalled();

		render(<Button variant="danger">x</Button>);
		render(<Badge label="b" variant="primary" />);
		expect(warn).toHaveBeenCalledTimes(1);
	});
});
