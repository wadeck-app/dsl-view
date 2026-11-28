import React from 'react';

import { reportAuthoringMistake } from '@dsl-ui/utils/devDiagnostics.js';
import * as RadixCollapsible from '@radix-ui/react-collapsible';
import { ChevronDown } from 'lucide-react';

export interface CollapsibleProps {
    /** The row's text. Give `title` or `header`. */
    title?: string;
    /**
     * The row's content when it is more than a text: an icon, a name and chips side by side. It fills the whole toggle row
     * (the chevron stays at the end) and replaces `title`.
     * @slot tag:atomic, tag:composite
     */
    header?: React.ReactNode;
    defaultOpen?: boolean;
    /** Controls the open state from the page (with `onOpenChange`). Without it the row keeps its own state, starting at `defaultOpen`. */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    /**
     * @slot tag:atomic, tag:composite, tag:disposition
     */
    children: React.ReactNode;
}

const TRIGGER_CLASS =
    'flex items-center justify-between w-full py-2 px-3 text-sm font-medium text-content hover:bg-muted-bg rounded cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-solid)] focus:ring-inset';

const CHEVRON_CLASS =
    'h-4 w-4 text-muted transition-transform duration-200 group-data-[state=open]:rotate-180';

/**
 * @registryCategory disposition
 * @registryTags collapsible accordion expandable
 */
export function Collapsible({ title, header, defaultOpen = false, open, onOpenChange, children }: CollapsibleProps) {
    if (title === undefined && header === undefined) {
        reportAuthoringMistake('[Collapsible] needs a `title` or a `header`: the toggle row would be empty.');
    }
    return (
        <RadixCollapsible.Root defaultOpen={defaultOpen} open={open} onOpenChange={onOpenChange} className="group w-full">
            <RadixCollapsible.Trigger className={TRIGGER_CLASS}>
                {header !== undefined ? <span className="flex min-w-0 flex-1 items-center gap-2 text-left">{header}</span> : <span>{title}</span>}
                <ChevronDown className={CHEVRON_CLASS} aria-hidden="true" />
            </RadixCollapsible.Trigger>
            <RadixCollapsible.Content className="overflow-hidden data-[state=open]:animate-none">
                <div className="px-3 py-2">
                    {children}
                </div>
            </RadixCollapsible.Content>
        </RadixCollapsible.Root>
    );
}
