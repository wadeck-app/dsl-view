import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InlineEdit } from './InlineEdit.js';

describe('InlineEdit', () => {
    it('shows value as text in display mode', () => {
        render(<InlineEdit value="Hello" onChange={() => {}} />);
        expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    it('shows placeholder when value is empty', () => {
        render(<InlineEdit value="" onChange={() => {}} placeholder="Enter text" />);
        expect(screen.getByText('Enter text')).toBeInTheDocument();
    });

    it('renders as a button in display mode', () => {
        render(<InlineEdit value="Hello" onChange={() => {}} />);
        expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    });

    it('clicking triggers edit mode and shows input', async () => {
        const user = userEvent.setup();
        render(<InlineEdit value="Hello" onChange={() => {}} />);
        await user.click(screen.getByRole('button', { name: 'Edit' }));
        expect(screen.getByRole('textbox', { name: 'Edit' })).toBeInTheDocument();
    });

    it('input contains the current value when entering edit mode', async () => {
        const user = userEvent.setup();
        render(<InlineEdit value="Hello" onChange={() => {}} />);
        await user.click(screen.getByRole('button', { name: 'Edit' }));
        expect(screen.getByRole('textbox', { name: 'Edit' })).toHaveValue('Hello');
    });

    it('Enter commits new value and calls onChange', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<InlineEdit value="Hello" onChange={onChange} />);
        await user.click(screen.getByRole('button', { name: 'Edit' }));
        const input = screen.getByRole('textbox', { name: 'Edit' });
        await user.clear(input);
        await user.type(input, 'World');
        await user.keyboard('{Enter}');
        expect(onChange).toHaveBeenCalledWith('World');
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('Escape cancels editing and restores original value', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<InlineEdit value="Hello" onChange={onChange} />);
        await user.click(screen.getByRole('button', { name: 'Edit' }));
        const input = screen.getByRole('textbox', { name: 'Edit' });
        await user.clear(input);
        await user.type(input, 'Changed');
        await user.keyboard('{Escape}');
        expect(onChange).not.toHaveBeenCalled();
        expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    it('blur commits the new value', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<InlineEdit value="Hello" onChange={onChange} />);
        await user.click(screen.getByRole('button', { name: 'Edit' }));
        const input = screen.getByRole('textbox', { name: 'Edit' });
        await user.clear(input);
        await user.type(input, 'Blurred');
        await user.tab();
        expect(onChange).toHaveBeenCalledWith('Blurred');
    });

    it('disabled prop prevents editing on click', async () => {
        const user = userEvent.setup();
        render(<InlineEdit value="Hello" onChange={() => {}} disabled />);
        const btn = screen.getByRole('button', { name: 'Edit' });
        expect(btn).toBeDisabled();
        await user.click(btn);
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('validate returning error message shows error and prevents commit', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const validate = (v: string) => (v.length < 3 ? 'Too short' : null);
        render(<InlineEdit value="Hello" onChange={onChange} validate={validate} />);
        await user.click(screen.getByRole('button', { name: 'Edit' }));
        const input = screen.getByRole('textbox', { name: 'Edit' });
        await user.clear(input);
        await user.type(input, 'Hi');
        await user.keyboard('{Enter}');
        expect(screen.getByRole('alert')).toHaveTextContent('Too short');
        expect(onChange).not.toHaveBeenCalled();
    });

    it('validate returning null allows commit', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const validate = (v: string) => (v.length < 3 ? 'Too short' : null);
        render(<InlineEdit value="Hello" onChange={onChange} validate={validate} />);
        await user.click(screen.getByRole('button', { name: 'Edit' }));
        const input = screen.getByRole('textbox', { name: 'Edit' });
        await user.clear(input);
        await user.type(input, 'Valid');
        await user.keyboard('{Enter}');
        expect(onChange).toHaveBeenCalledWith('Valid');
    });

    it('multiline=true renders textarea instead of input', async () => {
        const user = userEvent.setup();
        render(<InlineEdit value="Hello" onChange={() => {}} multiline />);
        await user.click(screen.getByRole('button', { name: 'Edit' }));
        expect(screen.getByRole('textbox', { name: 'Edit' }).tagName).toBe('TEXTAREA');
    });

    it('multiline: Enter does not commit, Ctrl+Enter commits', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<InlineEdit value="Hello" onChange={onChange} multiline />);
        await user.click(screen.getByRole('button', { name: 'Edit' }));
        const input = screen.getByRole('textbox', { name: 'Edit' });
        await user.clear(input);
        await user.type(input, 'Line1');
        // Plain Enter should NOT commit
        await user.keyboard('{Enter}');
        expect(onChange).not.toHaveBeenCalled();
        // Ctrl+Enter should commit
        await user.keyboard('{Control>}{Enter}{/Control}');
        expect(onChange).toHaveBeenCalled();
    });

    it('does not call onChange when value is unchanged on Enter', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<InlineEdit value="Hello" onChange={onChange} />);
        await user.click(screen.getByRole('button', { name: 'Edit' }));
        await user.keyboard('{Enter}');
        expect(onChange).not.toHaveBeenCalled();
    });

    it('applies className to the display button', () => {
        render(<InlineEdit value="Hello" onChange={() => {}} className="custom-class" />);
        expect(screen.getByRole('button', { name: 'Edit' })).toHaveClass('custom-class');
    });

    it('blur with invalid value cancels instead of committing', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const validate = (v: string) => (v.length < 3 ? 'Too short' : null);
        render(<InlineEdit value="Hello" onChange={onChange} validate={validate} />);
        await user.click(screen.getByRole('button', { name: 'Edit' }));
        const input = screen.getByRole('textbox', { name: 'Edit' });
        await user.clear(input);
        await user.type(input, 'Hi');
        await user.tab();
        // Should cancel, restoring original value and not calling onChange
        expect(onChange).not.toHaveBeenCalled();
        expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    it('syncs display value when parent updates value while not editing', () => {
        const { rerender } = render(<InlineEdit value="First" onChange={() => {}} />);
        expect(screen.getByText('First')).toBeInTheDocument();
        rerender(<InlineEdit value="Updated" onChange={() => {}} />);
        expect(screen.getByText('Updated')).toBeInTheDocument();
    });
});
