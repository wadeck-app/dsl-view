// The radiogroup is what assistive technology and getByRole('radiogroup') find: it carries the name, not only the fieldset around it.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RadioGroup } from './RadioGroup.js';

const OPTIONS = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }];

describe('RadioGroup accessible name', () => {
	it('the radiogroup is named by the label', () => {
		render(<RadioGroup options={OPTIONS} value="a" onChange={vi.fn()} label="Mode" />);
		expect(screen.getByRole('radiogroup', { name: 'Mode' })).toBeInTheDocument();
	});

	it('two groups on a page keep their own names', () => {
		render(
			<>
				<RadioGroup options={OPTIONS} value="a" onChange={vi.fn()} label="First" />
				<RadioGroup options={OPTIONS} value="a" onChange={vi.fn()} label="Second" />
			</>
		);
		expect(screen.getByRole('radiogroup', { name: 'First' })).toBeInTheDocument();
		expect(screen.getByRole('radiogroup', { name: 'Second' })).toBeInTheDocument();
	});

	it('without a label the radiogroup has no name and no dangling reference', () => {
		render(<RadioGroup options={OPTIONS} value="a" onChange={vi.fn()} />);
		expect(screen.getByRole('radiogroup')).not.toHaveAttribute('aria-labelledby');
	});
});
