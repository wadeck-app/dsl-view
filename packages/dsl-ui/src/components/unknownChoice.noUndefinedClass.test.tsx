import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './controls/_Button.js';
import { CheckboxGroup } from './controls/CheckboxGroup.js';
import { RadioGroup } from './controls/RadioGroup.js';
import { Avatar } from './display/Avatar.js';
import { Badge } from './display/Badge.js';
import { Progress } from './display/Progress.js';
import { Tag } from './display/Tag.js';
import { Card } from './layout/Card.js';
import { Link } from './navigation/Link.js';
import { Drawer } from './overlay/Drawer.js';

// A class map indexed by a prop returns undefined for a value it does not know (`variant: neutral` in queue's
// event-page.yaml), and a template string then prints the class `undefined`. The page must keep the component's default
// look and the authoring warning must still say what is wrong.
// Not 'neutral': that is a valid Button variant.
const BAD = 'bogus';

const CASES: Array<[string, string, () => React.ReactElement]> = [
	['Badge', 'variant', () => <Badge label="x" variant={BAD as never} />],
	['Badge', 'variant', () => <Badge label="x" tone="subtle" variant={BAD as never} />],
	['Badge', 'size', () => <Badge label="x" size={BAD as never} />],
	['Avatar', 'size', () => <Avatar fallback="AB" size={BAD as never} />],
	['Progress', 'variant', () => <Progress value={10} variant={BAD as never} />],
	['Progress', 'size', () => <Progress value={10} size={BAD as never} />],
	['Progress', 'layout', () => <Progress value={10} layout={BAD as never} />],
	['Tag', 'color', () => <Tag label="x" color={BAD as never} />],
	['Link', 'variant', () => <Link href="/a" label="x" variant={BAD as never} />],
	['Card', 'padding', () => <Card padding={BAD as never} header={<b>h</b>} footer={<b>f</b>}>c</Card>],
	['Drawer', 'size', () => <Drawer open onClose={() => {}} size={BAD as never}>c</Drawer>],
	['Drawer', 'size', () => <Drawer open onClose={() => {}} side="bottom" size={BAD as never}>c</Drawer>],
	['CheckboxGroup', 'orientation', () => <CheckboxGroup options={[{ value: 'a', label: 'A' }]} value={[]} onChange={() => {}} orientation={BAD as never} />],
	['RadioGroup', 'orientation', () => <RadioGroup options={[{ value: 'a', label: 'A' }]} value="" onChange={() => {}} orientation={BAD as never} />],
	['Button', 'variant', () => <Button variant={BAD as never}>x</Button>],
	['Button', 'size', () => <Button size={BAD as never}>x</Button>],
	['Button', 'shape', () => <Button shape={BAD as never}>x</Button>],
];

describe('an unknown class-map choice', () => {
	it.each(CASES)('%s %s: no "undefined" class, default look kept, warning names component, prop and value', (component, prop, build) => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		render(build());

		const classes = Array.from(document.body.querySelectorAll('[class]')).map((el) => el.getAttribute('class') ?? '');
		expect(classes.filter((c) => /(^|\s)undefined(\s|$)/.test(c))).toEqual([]);

		const messages = [...warn.mock.calls, ...error.mock.calls].map((c) => String(c[0]));
		expect(messages.some((m) => m.includes(`[${component}]`) && m.includes(prop) && m.includes(`"${BAD}"`))).toBe(true);
	});

	it('Badge falls back to the default variant classes, not to nothing', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { container } = render(<Badge label="x" variant={BAD as never} />);
		expect(container.firstElementChild).toHaveClass('bg-surface', 'text-content');
	});

	it('Badge, Progress and Button keep the known-value look when the value is null (no value)', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { container } = render(<Badge label="x" variant={null as never} />);
		expect(container.firstElementChild).toHaveClass('bg-surface');
		expect(warn).not.toHaveBeenCalled();
	});
});

describe('queue event-page.yaml: Badge variant "neutral"', () => {
	it('renders the default look and still warns', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { container } = render(<Badge label="x" variant={'neutral' as never} />);
		expect(container.firstElementChild?.getAttribute('class')).not.toMatch(/undefined/);
		expect(container.firstElementChild).toHaveClass('bg-surface');
		expect(String(warn.mock.calls[0]?.[0])).toContain('[Badge] unknown variant "neutral"');
	});
});
