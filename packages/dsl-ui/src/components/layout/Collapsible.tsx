import React from 'react';
import * as RadixCollapsible from '@radix-ui/react-collapsible';
import { ChevronDown } from 'lucide-react';

export interface CollapsibleProps {
    title: string;
    defaultOpen?: boolean;
    /**
     * @slot tag:field, tag:layout, tag:atomic
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
export function Collapsible({ title, defaultOpen = false, children }: CollapsibleProps) {
    return (
        <RadixCollapsible.Root defaultOpen={defaultOpen} className="group w-full">
            <RadixCollapsible.Trigger className={TRIGGER_CLASS}>
                <span>{title}</span>
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
