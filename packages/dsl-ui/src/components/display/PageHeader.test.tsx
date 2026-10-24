import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PageHeader } from './PageHeader.js';

describe('PageHeader', () => {
	it('renders title', () => {
		render(<PageHeader title="My Title" />);
		expect(screen.getByText('My Title')).toBeInTheDocument();
	});

	it('renders subtitle when provided', () => {
		render(<PageHeader title="My Title" subtitle="A subtitle" />);
		expect(screen.getByText('A subtitle')).toBeInTheDocument();
	});

	it('omits subtitle when not provided', () => {
		render(<PageHeader title="My Title" />);
		expect(screen.queryByText('A subtitle')).not.toBeInTheDocument();
	});

	it('renders headerActions to the right of the title in a flex justify-between container', () => {
		render(<PageHeader title="Trash" headerActions={<button>Empty Trash</button>} />);
		expect(screen.getByText('Trash')).toBeInTheDocument();
		expect(screen.getByText('Empty Trash')).toBeInTheDocument();
		// The wrapper should use justify-between
		const wrapper = screen.getByText('Trash').closest('div');
		expect(wrapper).toHaveClass('justify-between');
	});

	it('omits headerActions container when not provided', () => {
		render(<PageHeader title="Files" />);
		// No flex justify-between wrapper when headerActions is absent
		const h1 = screen.getByText('Files');
		expect(h1.closest('div[class*="justify-between"]')).toBeNull();
	});
});

describe('PageHeader layouts', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.resetModules();
	});

	// The warn-once memory lives in the module: load a fresh copy per test so each starts unwarned.
	async function freshPageHeader() {
		vi.resetModules();
		return (await import('./PageHeader.js')).PageHeader;
	}

	it('a page-level header is an h1, a section header (size sm) an h2', () => {
		const page = render(<PageHeader title="Files" />);
		expect(screen.getByRole('heading', { level: 1, name: 'Files' })).toBeInTheDocument();
		page.unmount();
		render(<PageHeader title="Files" size="sm" />);
		expect(screen.getByRole('heading', { level: 2, name: 'Files' })).toBeInTheDocument();
	});

	it('with an icon: the icon is decorative, the title is the h1 and the subtitle follows', () => {
		// Forwards every prop it receives, so the test sees exactly what PageHeader hands to an icon.
		const Icon = (props: Record<string, unknown>) => <svg data-testid="icon" {...props} />;
		render(<PageHeader title="Files" subtitle="All of them" icon={Icon} />);
		expect(screen.getByRole('heading', { level: 1, name: 'Files' })).toBeInTheDocument();
		expect(screen.getByText('All of them')).toBeInTheDocument();
		expect(screen.getByTestId('icon')).toHaveAttribute('aria-hidden', 'true');
	});

	it('size sm renders only the title and warns once about the props it ignores', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const Header = await freshPageHeader();
		const Icon = () => <svg />;
		const view = render(<Header title="Files" size="sm" subtitle="s" icon={Icon} headerActions={<button>Go</button>} />);
		expect(screen.queryByText('s')).toBeNull();
		expect(screen.queryByRole('button', { name: 'Go' })).toBeNull();
		expect(warn).toHaveBeenCalledExactlyOnceWith('[PageHeader] size "sm" does not render icon, subtitle, headerActions: it is ignored.');
		view.rerender(<Header title="Files" size="sm" subtitle="s" icon={Icon} headerActions={<button>Go</button>} />);
		expect(warn).toHaveBeenCalledTimes(1);
	});

	it('an icon header warns that headerActions is ignored; headerActions with a subtitle warns that the subtitle is', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const Header = await freshPageHeader();
		const Icon = () => <svg />;
		const withIcon = render(<Header title="A" icon={Icon} headerActions={<button>Go</button>} />);
		expect(screen.queryByRole('button', { name: 'Go' })).toBeNull();
		withIcon.unmount();
		render(<Header title="B" subtitle="sub" headerActions={<button>Go</button>} />);
		expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
		expect(screen.queryByText('sub')).toBeNull();
		expect(warn.mock.calls.map(call => call[0])).toEqual([
			'[PageHeader] an icon header does not render headerActions: it is ignored.',
			'[PageHeader] a header with headerActions does not render subtitle: it is ignored.',
		]);
	});

	it('does not warn when every prop is rendered', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const Header = await freshPageHeader();
		const Icon = () => <svg />;
		render(<Header title="A" subtitle="s" icon={Icon} />);
		render(<Header title="B" headerActions={<button>Go</button>} />);
		render(<Header title="C" size="sm" />);
		expect(warn).not.toHaveBeenCalled();
	});
});
