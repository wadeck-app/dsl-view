import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FieldTags } from './FieldTags.js';

describe('FieldTags', () => {
	it('renders label', () => {
		render(<FieldTags label="Keywords" value={[]} onChange={vi.fn()} />);
		expect(screen.getByText('Keywords')).toBeInTheDocument();
	});

	it('renders description when provided', () => {
		render(
			<FieldTags label="Keywords" description="Add relevant keywords" value={[]} onChange={vi.fn()} />,
		);
		expect(screen.getByText('Add relevant keywords')).toBeInTheDocument();
	});

	it('renders existing tags as pills', () => {
		render(<FieldTags label="Keywords" value={['react', 'typescript']} onChange={vi.fn()} />);
		expect(screen.getByText('react')).toBeInTheDocument();
		expect(screen.getByText('typescript')).toBeInTheDocument();
	});

	it('Enter key adds new tag', () => {
		const onChange = vi.fn();
		render(<FieldTags label="Keywords" value={[]} onChange={onChange} />);
		const input = screen.getByRole('textbox');
		fireEvent.change(input, { target: { value: 'newtag' } });
		fireEvent.keyDown(input, { key: 'Enter' });
		expect(onChange).toHaveBeenCalledWith(['newtag']);
	});

	it('comma key adds new tag', () => {
		const onChange = vi.fn();
		render(<FieldTags label="Keywords" value={[]} onChange={onChange} />);
		const input = screen.getByRole('textbox');
		fireEvent.change(input, { target: { value: 'newtag,' } });
		expect(onChange).toHaveBeenCalledWith(['newtag']);
	});

	it('Enter key does not add empty tag', () => {
		const onChange = vi.fn();
		render(<FieldTags label="Keywords" value={[]} onChange={onChange} />);
		const input = screen.getByRole('textbox');
		fireEvent.change(input, { target: { value: '   ' } });
		fireEvent.keyDown(input, { key: 'Enter' });
		expect(onChange).not.toHaveBeenCalled();
	});

	it('Enter key trims whitespace from tag', () => {
		const onChange = vi.fn();
		render(<FieldTags label="Keywords" value={[]} onChange={onChange} />);
		const input = screen.getByRole('textbox');
		fireEvent.change(input, { target: { value: '  hello  ' } });
		fireEvent.keyDown(input, { key: 'Enter' });
		expect(onChange).toHaveBeenCalledWith(['hello']);
	});

	it('clicking X on pill removes that tag', () => {
		const onChange = vi.fn();
		render(<FieldTags label="Keywords" value={['react', 'typescript']} onChange={onChange} />);
		const removeBtn = screen.getByRole('button', { name: 'Remove react' });
		fireEvent.click(removeBtn);
		expect(onChange).toHaveBeenCalledWith(['typescript']);
	});

	it('prevents duplicate tags by default', () => {
		const onChange = vi.fn();
		render(<FieldTags label="Keywords" value={['react']} onChange={onChange} />);
		const input = screen.getByRole('textbox');
		fireEvent.change(input, { target: { value: 'react' } });
		fireEvent.keyDown(input, { key: 'Enter' });
		expect(onChange).not.toHaveBeenCalled();
	});

	it('allows duplicates when allowDuplicates is true', () => {
		const onChange = vi.fn();
		render(
			<FieldTags label="Keywords" value={['react']} onChange={onChange} allowDuplicates />,
		);
		const input = screen.getByRole('textbox');
		fireEvent.change(input, { target: { value: 'react' } });
		fireEvent.keyDown(input, { key: 'Enter' });
		expect(onChange).toHaveBeenCalledWith(['react', 'react']);
	});

	it('respects maxTags limit: does not add beyond limit', () => {
		const onChange = vi.fn();
		render(
			<FieldTags label="Keywords" value={['a', 'b']} onChange={onChange} maxTags={2} />,
		);
		const input = screen.getByRole('textbox');
		expect(input).toBeDisabled();
		fireEvent.change(input, { target: { value: 'c' } });
		fireEvent.keyDown(input, { key: 'Enter' });
		expect(onChange).not.toHaveBeenCalled();
	});

	it('input is disabled once maxTags is reached', () => {
		render(
			<FieldTags label="Keywords" value={['a', 'b', 'c']} onChange={vi.fn()} maxTags={3} />,
		);
		expect(screen.getByRole('textbox')).toBeDisabled();
	});

	it('Backspace on empty input removes last tag', () => {
		const onChange = vi.fn();
		render(<FieldTags label="Keywords" value={['react', 'typescript']} onChange={onChange} />);
		const input = screen.getByRole('textbox');
		fireEvent.keyDown(input, { key: 'Backspace' });
		expect(onChange).toHaveBeenCalledWith(['react']);
	});

	it('Backspace on non-empty input does not remove last tag', () => {
		const onChange = vi.fn();
		render(<FieldTags label="Keywords" value={['react']} onChange={onChange} />);
		const input = screen.getByRole('textbox');
		fireEvent.change(input, { target: { value: 'ty' } });
		fireEvent.keyDown(input, { key: 'Backspace' });
		expect(onChange).not.toHaveBeenCalled();
	});

	it('shows error message when error prop provided', () => {
		render(
			<FieldTags label="Keywords" value={[]} onChange={vi.fn()} error="At least one tag required" />,
		);
		expect(screen.getByText('At least one tag required')).toBeInTheDocument();
	});

	it('is disabled when disabled prop is true', () => {
		render(<FieldTags label="Keywords" value={['react']} onChange={vi.fn()} disabled />);
		expect(screen.getByRole('textbox')).toBeDisabled();
	});

	it('remove buttons are hidden when disabled', () => {
		render(<FieldTags label="Keywords" value={['react']} onChange={vi.fn()} disabled />);
		expect(screen.queryByRole('button', { name: 'Remove react' })).not.toBeInTheDocument();
	});

	it('shows required indicator when required prop is true', () => {
		render(<FieldTags label="Keywords" value={[]} onChange={vi.fn()} required />);
		expect(screen.getByText('*')).toBeInTheDocument();
	});

	describe('input behaviour', () => {
		const input = () => screen.getByRole('textbox');

		it('the label is bound to the input', () => {
			render(<FieldTags label="Keywords" value={[]} onChange={vi.fn()} />);
			expect(screen.getByLabelText('Keywords')).toBe(input());
		});

		it('adding a tag clears the input; a rejected duplicate leaves the typed text for the user to fix', () => {
			const { rerender } = render(<FieldTags label="Keywords" value={['a']} onChange={vi.fn()} />);
			fireEvent.change(input(), { target: { value: 'b' } });
			fireEvent.keyDown(input(), { key: 'Enter' });
			expect(input()).toHaveValue('');
			rerender(<FieldTags label="Keywords" value={['a', 'b']} onChange={vi.fn()} />);
			fireEvent.change(input(), { target: { value: 'a' } });
			fireEvent.keyDown(input(), { key: 'Enter' });
			expect(input()).toHaveValue('a');
		});

		it('Enter is consumed (no form submit), other keys are not', () => {
			render(<FieldTags label="Keywords" value={[]} onChange={vi.fn()} />);
			expect(fireEvent.keyDown(input(), { key: 'Enter' })).toBe(false);
			expect(fireEvent.keyDown(input(), { key: 'a' })).toBe(true);
		});

		it('a lone comma adds nothing and is swallowed', () => {
			const onChange = vi.fn();
			render(<FieldTags label="Keywords" value={[]} onChange={onChange} />);
			fireEvent.change(input(), { target: { value: ',' } });
			expect(onChange).not.toHaveBeenCalled();
			expect(input()).toHaveValue('');
		});

		it('a comma commits what precedes it and keeps the text after it for the next tag', () => {
			const onChange = vi.fn();
			render(<FieldTags label="Keywords" value={[]} onChange={onChange} />);
			fireEvent.change(input(), { target: { value: 'a,b' } });
			expect(onChange).toHaveBeenCalledExactlyOnceWith(['a']);
			expect(input()).toHaveValue('b');
		});

		it('several commas in one change commit every complete part in a single onChange call', () => {
			const onChange = vi.fn();
			render(<FieldTags label="Keywords" value={['x']} onChange={onChange} />);
			fireEvent.change(input(), { target: { value: 'a, b ,,c,' } });
			expect(onChange).toHaveBeenCalledExactlyOnceWith(['x', 'a', 'b', 'c']);
			expect(input()).toHaveValue('');
		});

		it('pasting comma separated text adds each tag, trimmed, and inserts nothing in the input', () => {
			const onChange = vi.fn();
			render(<FieldTags label="Keywords" value={[]} onChange={onChange} />);
			const notPrevented = fireEvent.paste(input(), { clipboardData: { getData: () => ' red , green,blue ' } });
			expect(notPrevented).toBe(false);
			expect(onChange).toHaveBeenCalledExactlyOnceWith(['red', 'green', 'blue']);
			expect(input()).toHaveValue('');
		});

		it('pasting text without a comma is left to the browser: one tag is added with Enter as usual', () => {
			const onChange = vi.fn();
			render(<FieldTags label="Keywords" value={[]} onChange={onChange} />);
			expect(fireEvent.paste(input(), { clipboardData: { getData: () => 'single tag' } })).toBe(true);
			expect(onChange).not.toHaveBeenCalled();
		});

		it('a paste keeps the duplicates and the overflow out, and says which', () => {
			const onChange = vi.fn();
			render(<FieldTags label="Keywords" value={['a']} maxTags={3} onChange={onChange} />);
			fireEvent.paste(input(), { clipboardData: { getData: () => 'a,b,b,c,d' } });
			expect(onChange).toHaveBeenCalledExactlyOnceWith(['a', 'b', 'c']);
			expect(screen.getByRole('status')).toHaveTextContent('Already added: a, b. Limit of 3 tags reached, 1 not added');
		});

		it('a duplicate is announced in a live region tied to the input, and nothing is added', () => {
			const onChange = vi.fn();
			render(<FieldTags label="Keywords" value={['a']} onChange={onChange} />);
			expect(screen.getByRole('status')).toBeEmptyDOMElement();
			fireEvent.change(input(), { target: { value: 'a' } });
			fireEvent.keyDown(input(), { key: 'Enter' });
			expect(onChange).not.toHaveBeenCalled();
			const status = screen.getByRole('status');
			expect(status).toHaveTextContent('Already added: a');
			expect(input().getAttribute('aria-describedby')).toBe(status.id);
		});

		it('the message goes away when the user types again, and after a successful add', () => {
			render(<FieldTags label="Keywords" value={['a']} onChange={vi.fn()} />);
			fireEvent.change(input(), { target: { value: 'a' } });
			fireEvent.keyDown(input(), { key: 'Enter' });
			expect(screen.getByRole('status')).toHaveTextContent('Already added: a');
			fireEvent.change(input(), { target: { value: 'ab' } });
			expect(screen.getByRole('status')).toBeEmptyDOMElement();
			fireEvent.change(input(), { target: { value: 'a' } });
			fireEvent.keyDown(input(), { key: 'Enter' });
			fireEvent.change(input(), { target: { value: 'zz,' } });
			expect(screen.getByRole('status')).toBeEmptyDOMElement();
			expect(input()).not.toHaveAttribute('aria-describedby');
		});

		it('removing a tag clears a stale message', () => {
			render(<FieldTags label="Keywords" value={['a']} onChange={vi.fn()} />);
			fireEvent.change(input(), { target: { value: 'a' } });
			fireEvent.keyDown(input(), { key: 'Enter' });
			fireEvent.click(screen.getByRole('button', { name: 'Remove a' }));
			expect(screen.getByRole('status')).toBeEmptyDOMElement();
		});

		it('the duplicate message and the validation error are both referenced by the input', () => {
			render(<FieldTags label="Keywords" error="Required" value={['a']} onChange={vi.fn()} />);
			fireEvent.change(input(), { target: { value: 'a' } });
			fireEvent.keyDown(input(), { key: 'Enter' });
			const ids = input().getAttribute('aria-describedby')!.split(' ');
			expect(ids).toEqual([screen.getByRole('alert').id, screen.getByRole('status').id]);
		});

		it('Backspace on an empty input with no tags does nothing', () => {
			const onChange = vi.fn();
			render(<FieldTags label="Keywords" value={[]} onChange={onChange} />);
			fireEvent.keyDown(input(), { key: 'Backspace' });
			expect(onChange).not.toHaveBeenCalled();
		});

		it('the new tag goes at the end and existing tags keep their order', () => {
			const onChange = vi.fn();
			render(<FieldTags label="Keywords" value={['b', 'a']} onChange={onChange} />);
			fireEvent.change(input(), { target: { value: 'c' } });
			fireEvent.keyDown(input(), { key: 'Enter' });
			expect(onChange).toHaveBeenCalledExactlyOnceWith(['b', 'a', 'c']);
		});

		it('with duplicates allowed, removing a pill removes that occurrence only', () => {
			const onChange = vi.fn();
			render(<FieldTags label="Keywords" value={['a', 'b', 'a']} onChange={onChange} allowDuplicates />);
			const removes = screen.getAllByRole('button', { name: 'Remove a' });
			fireEvent.click(removes[0] as HTMLElement);
			expect(onChange).toHaveBeenLastCalledWith(['b', 'a']);
			fireEvent.click(removes[1] as HTMLElement);
			expect(onChange).toHaveBeenLastCalledWith(['a', 'b']);
		});

		it('removing the only pill reports an empty list and nothing else', () => {
			const onChange = vi.fn();
			render(<FieldTags label="Keywords" value={['a']} onChange={onChange} />);
			fireEvent.click(screen.getByRole('button', { name: 'Remove a' }));
			expect(onChange).toHaveBeenCalledExactlyOnceWith([]);
		});

		it('clicking the container focuses the input, unless disabled', () => {
			const { container, rerender } = render(<FieldTags label="Keywords" value={[]} onChange={vi.fn()} />);
			fireEvent.click(container.querySelector('.cursor-text') as HTMLElement);
			expect(document.activeElement).toBe(input());
			(document.activeElement as HTMLElement).blur();
			rerender(<FieldTags label="Keywords" value={[]} onChange={vi.fn()} disabled />);
			fireEvent.click(container.querySelector('.cursor-text') as HTMLElement);
			expect(document.activeElement).not.toBe(input());
		});

		it('the placeholder shows only while a tag can still be added', () => {
			const { rerender } = render(<FieldTags label="Keywords" value={[]} onChange={vi.fn()} placeholder="Add one" maxTags={1} />);
			expect(input()).toHaveAttribute('placeholder', 'Add one');
			rerender(<FieldTags label="Keywords" value={['a']} onChange={vi.fn()} placeholder="Add one" maxTags={1} />);
			expect(input()).toHaveAttribute('placeholder', '');
			rerender(<FieldTags label="Keywords" value={[]} onChange={vi.fn()} placeholder="Add one" disabled />);
			expect(input()).toHaveAttribute('placeholder', '');
		});

		it('removing a tag from a full field makes the input usable again', () => {
			const { rerender } = render(<FieldTags label="Keywords" value={['a', 'b']} onChange={vi.fn()} maxTags={2} />);
			expect(input()).toBeDisabled();
			rerender(<FieldTags label="Keywords" value={['a']} onChange={vi.fn()} maxTags={2} />);
			expect(input()).toBeEnabled();
		});

		it('an error is announced and tied to the input', () => {
			render(<FieldTags label="Keywords" value={[]} onChange={vi.fn()} error="Required" />);
			const alert = screen.getByRole('alert');
			expect(alert).toHaveTextContent('Required');
			expect(input()).toHaveAttribute('aria-invalid', 'true');
			expect(input().getAttribute('aria-describedby')).toBe(alert.id);
		});

		it('without an error the input is not flagged invalid', () => {
			render(<FieldTags label="Keywords" value={[]} onChange={vi.fn()} />);
			expect(input()).not.toHaveAttribute('aria-invalid');
			expect(input()).not.toHaveAttribute('aria-describedby');
			expect(screen.queryByRole('alert')).not.toBeInTheDocument();
		});

		it('required is exposed to assistive tech and the asterisk is decorative only', () => {
			render(<FieldTags label="Keywords" value={[]} onChange={vi.fn()} required />);
			expect(input()).toHaveAttribute('aria-required', 'true');
			expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
		});
	});

	it('renders no hidden input without a name', () => {
		const { container } = render(<FieldTags label="Keywords" value={['a']} onChange={vi.fn()} />);
		expect(container.querySelectorAll('input[type="hidden"]')).toHaveLength(0);
	});

	it('renders hidden inputs for form submission when name provided', () => {
		const { container } = render(
			<FieldTags label="Keywords" value={['react', 'ts']} onChange={vi.fn()} name="tags" />,
		);
		const hiddenInputs = container.querySelectorAll('input[type="hidden"]');
		expect(hiddenInputs).toHaveLength(2);
		expect(hiddenInputs[0]).toHaveAttribute('value', 'react');
		expect(hiddenInputs[1]).toHaveAttribute('value', 'ts');
	});
});
