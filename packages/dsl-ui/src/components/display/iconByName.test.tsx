import { render } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ICON_NAMES, iconByName, iconComponentByName } from './iconByName.js';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('icon vocabulary', () => {
	// Pinned on purpose: a removed name breaks every YAML view that uses it, so removing one must be a deliberate edit here.
	it('lists exactly these names', () => {
		expect([...ICON_NAMES].sort()).toEqual([
			'archive',
			'arrow-right',
			'check',
			'chevron-right',
			'copy',
			'download',
			'external-link',
			'eye',
			'file-text',
			'info',
			'link',
			'list',
			'pencil',
			'play',
			'plus',
			'refresh-cw',
			'rocket',
			'rotate-ccw',
			'search',
			'send',
			'trash',
			'x',
		]);
	});

	it('draws a distinct, decorative svg for every name', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const seen = new Map<string, string>();
		for (const name of ICON_NAMES) {
			const { container, unmount } = render(<>{iconByName(name, 'test')}</>);
			const svg = container.querySelector('svg');
			expect(svg, name).not.toBeNull();
			expect(svg!.getAttribute('aria-hidden'), name).toBe('true');
			const lucideClass = (svg!.getAttribute('class') ?? '').split(' ').find(token => token.startsWith('lucide-') && token !== 'lucide');
			expect(lucideClass, name).toBeDefined();
			// two names must not silently map to the same drawing
			expect(seen.get(lucideClass!), `${name} and ${seen.get(lucideClass!)} share an icon`).toBeUndefined();
			seen.set(lucideClass!, name);
			unmount();
		}
		expect(error).not.toHaveBeenCalled();
	});

	it('maps the action names queue needs to recognisable icons', () => {
		const classOf = (name: string) => render(<>{iconByName(name, 'test')}</>).container.querySelector('svg')!.getAttribute('class') ?? '';
		expect(classOf('rocket')).toContain('lucide-rocket');
		expect(classOf('rotate-ccw')).toContain('lucide-rotate-ccw');
		expect(classOf('play')).toContain('lucide-play');
		expect(classOf('archive')).toContain('lucide-archive');
		expect(classOf('send')).toContain('lucide-send');
		expect(classOf('trash')).toContain('lucide-trash');
	});

	it('falls back to external-link and reports an unknown name once, with the supported names', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const first = render(<>{iconByName('no-such-icon', 'where-a')}</>);
		render(<>{iconByName('no-such-icon', 'where-a')}</>);
		expect(first.container.querySelector('svg')!.getAttribute('class')).toContain('lucide-external-link');
		expect(error).toHaveBeenCalledTimes(1);
		const message = String(error.mock.calls[0]![0]);
		expect(message).toContain('[where-a] unknown icon "no-such-icon"');
		for (const name of ICON_NAMES) {
			expect(message).toContain(name);
		}
	});

	it('lists the supported names separated by ", " in the report', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		render(<>{iconByName('no-such-icon-b', 'where-b')}</>);
		expect(String(error.mock.calls[0]![0])).toContain(`Supported icons: ${ICON_NAMES.join(', ')}.`);
	});

	it('sizes the icon 3.5 by default and takes a given class instead', () => {
		const sized = render(<>{iconByName('check', 'test')}</>).container.querySelector('svg')!;
		expect(sized.getAttribute('class')).toContain('h-3.5 w-3.5');
		const custom = render(<>{iconByName('check', 'test', 'h-8 w-8')}</>).container.querySelector('svg')!;
		expect(custom.getAttribute('class')).toContain('h-8 w-8');
		expect(custom.getAttribute('class')).not.toContain('h-3.5');
	});

	it('uses external-link when no name is given, without any error', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const { container } = render(<>{iconByName(undefined, 'test')}</>);
		expect(container.querySelector('svg')!.getAttribute('class')).toContain('lucide-external-link');
		expect(error).not.toHaveBeenCalled();
	});
});

describe('iconComponentByName', () => {
	it('returns the component of a known name without any report', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const Icon = iconComponentByName('check', 'test');
		expect(Icon).toBeDefined();
		const svg = render(<>{Icon && <Icon />}</>).container.querySelector('svg');
		expect(svg!.getAttribute('class')).toContain('lucide-check');
		expect(error).not.toHaveBeenCalled();
	});

	it('shows no icon for an unknown name and reports it with the supported names', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		expect(iconComponentByName('no-such-icon-c', 'where-c')).toBeUndefined();
		expect(error).toHaveBeenCalledTimes(1);
		const message = String(error.mock.calls[0]![0]);
		expect(message).toContain('[where-c] unknown icon "no-such-icon-c": no icon is shown.');
		expect(message).toContain(`Supported icons: ${ICON_NAMES.join(', ')}.`);
	});
});
