import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Collapsible } from './Collapsible.js';

describe('Collapsible', () => {
    it('renders the title', () => {
        render(<Collapsible title="Settings"><p>Content</p></Collapsible>);
        expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('hides content by default', () => {
        render(<Collapsible title="Settings"><p>Hidden content</p></Collapsible>);
        // Radix Collapsible removes content from DOM when closed
        expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
    });

    it('shows content when defaultOpen is true', () => {
        render(<Collapsible title="Settings" defaultOpen><p>Visible content</p></Collapsible>);
        expect(screen.getByText('Visible content')).toBeVisible();
    });

    it('toggles content on trigger click', () => {
        render(<Collapsible title="Settings"><p>Toggle content</p></Collapsible>);
        const trigger = screen.getByRole('button');
        fireEvent.click(trigger);
        expect(screen.getByText('Toggle content')).toBeVisible();
        fireEvent.click(trigger);
        // Radix Collapsible removes content from DOM when closed
        expect(screen.queryByText('Toggle content')).not.toBeInTheDocument();
    });
});
