import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// The deep path that consumers' committed generated entries still import (before this file was renamed to PageSection.tsx).
import { PageSection } from './PageHeader.js';

describe('legacy layout/PageHeader.js path', () => {
	it('still renders PageSection and says once, naming the new path, that the import is stale', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { rerender } = render(<PageSection title="Projects" actions={<button>New</button>} />);
		rerender(<PageSection title="Projects" actions={<button>New</button>} />);

		expect(screen.getByRole('heading', { name: 'Projects' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument();
		const messages = warn.mock.calls.map((c) => String(c[0]));
		expect(messages).toHaveLength(1);
		expect(messages[0]).toContain('layout/PageHeader.js');
		expect(messages[0]).toContain('layout/PageSection.js');
	});
});
