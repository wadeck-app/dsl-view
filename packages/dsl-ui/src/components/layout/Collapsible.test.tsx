import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

    it('exposes the open state to assistive tech and points the trigger at its content', () => {
        render(<Collapsible title="Settings"><p>Body</p></Collapsible>);
        const trigger = screen.getByRole('button', { name: 'Settings' });
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        fireEvent.click(trigger);
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        const contentId = trigger.getAttribute('aria-controls');
        expect(contentId).toBeTruthy();
        expect(document.getElementById(contentId as string)).toContainElement(screen.getByText('Body'));
    });

    it('defaultOpen starts expanded', () => {
        render(<Collapsible title="Settings" defaultOpen><p>Body</p></Collapsible>);
        expect(screen.getByRole('button', { name: 'Settings' })).toHaveAttribute('aria-expanded', 'true');
    });

    it('toggles from the keyboard (Enter and Space) and keeps focus on the trigger', async () => {
        const user = userEvent.setup();
        render(<Collapsible title="Settings"><p>Body</p></Collapsible>);
        const trigger = screen.getByRole('button', { name: 'Settings' });
        trigger.focus();
        await user.keyboard('{Enter}');
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        await user.keyboard(' ');
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(document.activeElement).toBe(trigger);
    });

    it('instances are independent', () => {
        render(
            <>
                <Collapsible title="A"><p>Body A</p></Collapsible>
                <Collapsible title="B"><p>Body B</p></Collapsible>
            </>
        );
        fireEvent.click(screen.getByRole('button', { name: 'A' }));
        expect(screen.getByText('Body A')).toBeVisible();
        expect(screen.queryByText('Body B')).not.toBeInTheDocument();
    });
});
