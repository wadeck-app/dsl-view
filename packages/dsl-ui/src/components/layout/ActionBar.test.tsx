import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ActionBar } from './ActionBar.js';

describe('ActionBar', () => {
	it('renders children', () => {
		render(
			<ActionBar>
				<button>Save</button>
				<button>Cancel</button>
			</ActionBar>
		);
		expect(screen.getByText('Save')).toBeInTheDocument();
		expect(screen.getByText('Cancel')).toBeInTheDocument();
	});
});
