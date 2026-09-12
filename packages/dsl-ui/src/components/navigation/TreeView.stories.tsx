import type { Meta, StoryObj } from '@storybook/react';
import { File, Folder, FolderOpen } from 'lucide-react';
import React, { useState } from 'react';

import { TreeView } from './TreeView.js';
import type { TreeNode } from './TreeView.js';

const meta: Meta<typeof TreeView> = {
    title: 'Navigation/TreeView',
    component: TreeView,
    parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof TreeView>;

// ---------------------------------------------------------------------------
// Shared data
// ---------------------------------------------------------------------------

const fileTree: TreeNode[] = [
    {
        id: 'src',
        label: 'src',
        icon: <Folder className="h-4 w-4" />,
        children: [
            {
                id: 'src-components',
                label: 'components',
                icon: <Folder className="h-4 w-4" />,
                children: [
                    { id: 'src-components-button', label: 'Button.tsx', icon: <File className="h-4 w-4" /> },
                    { id: 'src-components-input', label: 'Input.tsx', icon: <File className="h-4 w-4" /> },
                    { id: 'src-components-modal', label: 'Modal.tsx', icon: <File className="h-4 w-4" /> },
                ],
            },
            {
                id: 'src-utils',
                label: 'utils',
                icon: <Folder className="h-4 w-4" />,
                children: [
                    { id: 'src-utils-format', label: 'format.ts', icon: <File className="h-4 w-4" /> },
                    { id: 'src-utils-validate', label: 'validate.ts', icon: <File className="h-4 w-4" /> },
                ],
            },
            { id: 'src-index', label: 'index.ts', icon: <File className="h-4 w-4" /> },
        ],
    },
    {
        id: 'public',
        label: 'public',
        icon: <Folder className="h-4 w-4" />,
        children: [
            { id: 'public-favicon', label: 'favicon.ico', icon: <File className="h-4 w-4" /> },
            { id: 'public-robots', label: 'robots.txt', icon: <File className="h-4 w-4" /> },
        ],
    },
    { id: 'package-json', label: 'package.json', icon: <File className="h-4 w-4" /> },
    { id: 'tsconfig', label: 'tsconfig.json', icon: <File className="h-4 w-4" /> },
];

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

export const Default: Story = {
    args: {
        nodes: fileTree,
        defaultExpandedIds: ['src'],
    },
};

export const WithInitialSelection: Story = {
    args: {
        nodes: fileTree,
        defaultExpandedIds: ['src', 'src-components'],
        selectedId: 'src-components-button',
    },
};

export const ControlledExpand: Story = {
    render: () => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [expandedIds, setExpandedIds] = useState<string[]>(['src']);

        function handleExpandChange(id: string, expanded: boolean) {
            setExpandedIds(prev =>
                expanded ? [...prev, id] : prev.filter(x => x !== id)
            );
        }

        return (
            <div className="space-y-4">
                <p className="text-sm text-muted">
                    Expanded: <code>{expandedIds.join(', ') || '(none)'}</code>
                </p>
                <TreeView
                    nodes={fileTree}
                    expandedIds={expandedIds}
                    onExpandChange={handleExpandChange}
                />
            </div>
        );
    },
};

export const WithIcons: Story = {
    render: () => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [expandedIds, setExpandedIds] = useState<string[]>(['src', 'src-components']);

        const nodesWithDynamicIcons: TreeNode[] = fileTree.map(node =>
            addDynamicFolderIcon(node, expandedIds)
        );

        return (
            <TreeView
                nodes={nodesWithDynamicIcons}
                expandedIds={expandedIds}
                onExpandChange={(id, expanded) => {
                    setExpandedIds(prev =>
                        expanded ? [...prev, id] : prev.filter(x => x !== id)
                    );
                }}
            />
        );
    },
};

function addDynamicFolderIcon(node: TreeNode, expandedIds: string[]): TreeNode {
    const isExpanded = expandedIds.includes(node.id);
    const icon = node.children?.length
        ? isExpanded
            ? <FolderOpen className="h-4 w-4 text-yellow-500" />
            : <Folder className="h-4 w-4 text-yellow-500" />
        : <File className="h-4 w-4 text-blue-400" />;

    return {
        ...node,
        icon,
        children: node.children?.map(c => addDynamicFolderIcon(c, expandedIds)),
    };
}

// ---------------------------------------------------------------------------
// Large tree (20+ nodes)
// ---------------------------------------------------------------------------

function makeNodes(prefix: string, count: number): TreeNode[] {
    return Array.from({ length: count }, (_, i) => ({
        id: `${prefix}-${i}`,
        label: `${prefix} item ${i + 1}`,
        icon: <File className="h-4 w-4" />,
    }));
}

const largeTree: TreeNode[] = [
    {
        id: 'group-a',
        label: 'Group A',
        icon: <Folder className="h-4 w-4" />,
        children: makeNodes('a', 8),
    },
    {
        id: 'group-b',
        label: 'Group B',
        icon: <Folder className="h-4 w-4" />,
        children: makeNodes('b', 8),
    },
    {
        id: 'group-c',
        label: 'Group C',
        icon: <Folder className="h-4 w-4" />,
        children: makeNodes('c', 8),
    },
];

export const LargeTree: Story = {
    args: {
        nodes: largeTree,
        defaultExpandedIds: ['group-a'],
    },
};

// ---------------------------------------------------------------------------
// Disabled nodes
// ---------------------------------------------------------------------------

const nodesWithDisabled: TreeNode[] = [
    { id: 'd1', label: 'Enabled Node' },
    { id: 'd2', label: 'Disabled Node', disabled: true },
    {
        id: 'd3',
        label: 'Parent with disabled child',
        children: [
            { id: 'd3a', label: 'Normal child' },
            { id: 'd3b', label: 'Disabled child', disabled: true },
        ],
    },
    { id: 'd4', label: 'Another enabled' },
];

export const DisabledNodes: Story = {
    args: {
        nodes: nodesWithDisabled,
        defaultExpandedIds: ['d3'],
    },
};
