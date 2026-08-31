import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Form } from './Form.js';
import { UnsavedBadge } from './UnsavedBadge.js';

describe('UnsavedBadge', () => {
	it('returns null when hasChanges=false', () => {
		const { container } = render(<UnsavedBadge hasChanges={false} />);
		expect(container).toBeEmptyDOMElement();
	});

	it('renders "Unsaved changes" when hasChanges=true', () => {
		render(<UnsavedBadge hasChanges={true} />);
		expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
	});

	it('reads hasChanges from FormContext - hidden when no changes', () => {
		render(
			<Form
				fields={<UnsavedBadge />}
				actions={<div />}
				onSubmit={vi.fn().mockResolvedValue(undefined)}
				initialData={{ x: 1 }}
			/>
		);
		expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
	});
});
