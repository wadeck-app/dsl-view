import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Radio } from './Radio.js';

describe('Radio', () => {
	it('is a radio input and passes native props through (name, value, checked, disabled)', () => {
		render(<Radio name="size" value="small" defaultChecked disabled aria-label="small" />);

		const radio = screen.getByRole('radio', { name: 'small' }) as HTMLInputElement;
		expect(radio.type).toBe('radio');
		expect(radio.name).toBe('size');
		expect(radio.value).toBe('small');
		expect(radio.checked).toBe(true);
		expect(radio.disabled).toBe(true);
	});

	it('reports changes to onChange', () => {
		const onChange = vi.fn();
		render(<Radio name="size" value="small" onChange={onChange} aria-label="small" />);

		fireEvent.click(screen.getByRole('radio'));

		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it('a className is added to the base classes, not substituted for them', () => {
		render(<Radio aria-label="plain" />);
		const plain = screen.getByRole('radio', { name: 'plain' });
		expect(plain.className).toBe('h-3.5 w-3.5 border-border text-primary focus:ring-primary');

		render(<Radio aria-label="extra" className="ml-2" />);
		const extra = screen.getByRole('radio', { name: 'extra' });
		expect(extra).toHaveClass('h-3.5', 'focus:ring-primary', 'ml-2');
	});

	it('forwards its ref to the input', () => {
		const ref = React.createRef<HTMLInputElement>();
		render(<Radio ref={ref} aria-label="ref" />);

		expect(ref.current).toBe(screen.getByRole('radio'));
	});

	it('a radio group lets one choice stand at a time', () => {
		render(
			<>
				<Radio name="g" value="a" aria-label="a" />
				<Radio name="g" value="b" aria-label="b" />
			</>
		);

		fireEvent.click(screen.getByRole('radio', { name: 'a' }));
		fireEvent.click(screen.getByRole('radio', { name: 'b' }));

		expect((screen.getByRole('radio', { name: 'a' }) as HTMLInputElement).checked).toBe(false);
		expect((screen.getByRole('radio', { name: 'b' }) as HTMLInputElement).checked).toBe(true);
	});
});
