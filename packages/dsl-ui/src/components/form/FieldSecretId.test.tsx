// A caller that wires the field by id (a hidden username next to it, a test, an aria reference) can give it one.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FieldSecret } from './FieldSecret.js';

describe('FieldSecret id', () => {
	it('uses the id given and keeps the label wired to it', () => {
		render(<FieldSecret label="Passphrase" id="admin-passphrase" />);
		const input = screen.getByLabelText('Passphrase');
		expect(input).toHaveAttribute('id', 'admin-passphrase');
		expect(document.getElementById('admin-passphrase')).toBe(input);
	});

	it('generates its own id without one', () => {
		render(<FieldSecret label="Passphrase" />);
		expect(screen.getByLabelText('Passphrase').id).not.toBe('');
	});
});
