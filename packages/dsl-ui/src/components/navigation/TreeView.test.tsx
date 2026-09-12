import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TreeView } from './TreeView.js';
import type { TreeNode } from './TreeView.js';

const simpleNodes: TreeNode[] = [
    { id: 'a', label: 'Alpha' },
    { id: 'b', label: 'Beta' },
    { id: 'c', label: 'Gamma' },
];

const nestedNodes: TreeNode[] = [
    {
        id: 'root1',
        label: 'Root One',
        children: [
            { id: 'child1', label: 'Child One' },
            { id: 'child2', label: 'Child Two' },
        ],
    },
    { id: 'root2', label: 'Root Two' },
];

const deepNodes: TreeNode[] = [
    {
        id: 'p1',
        label: 'Parent',
        children: [
            {
                id: 'c1',
                label: 'Child',
                children: [
                    { id: 'gc1', label: 'Grandchild' },
                ],
            },
        ],
    },
];

describe('TreeView', () => {
    // --- Basic rendering ---

    it('renders top-level nodes', () => {
        render(<TreeView nodes={simpleNodes} />);
        expect(screen.getByText('Alpha')).toBeInTheDocument();
        expect(screen.getByText('Beta')).toBeInTheDocument();
        expect(screen.getByText('Gamma')).toBeInTheDocument();
    });

    it('renders a tree with role="tree"', () => {
        render(<TreeView nodes={simpleNodes} />);
        expect(screen.getByRole('tree')).toBeInTheDocument();
    });

    it('renders treeitems with role="treeitem"', () => {
        render(<TreeView nodes={simpleNodes} />);
        const items = screen.getAllByRole('treeitem');
        expect(items).toHaveLength(3);
    });

    it('does not render children of collapsed nodes', () => {
        render(<TreeView nodes={nestedNodes} />);
        expect(screen.queryByText('Child One')).not.toBeInTheDocument();
        expect(screen.queryByText('Child Two')).not.toBeInTheDocument();
    });

    // --- Expand / collapse ---

    it('expands a node when chevron is clicked', () => {
        render(<TreeView nodes={nestedNodes} />);
        const expandBtn = screen.getByRole('button', { name: 'Expand' });
        fireEvent.click(expandBtn);
        expect(screen.getByText('Child One')).toBeInTheDocument();
        expect(screen.getByText('Child Two')).toBeInTheDocument();
    });

    it('collapses an expanded node when chevron is clicked again', () => {
        render(<TreeView nodes={nestedNodes} />);
        const expandBtn = screen.getByRole('button', { name: 'Expand' });
        fireEvent.click(expandBtn);
        expect(screen.getByText('Child One')).toBeInTheDocument();

        const collapseBtn = screen.getByRole('button', { name: 'Collapse' });
        fireEvent.click(collapseBtn);
        expect(screen.queryByText('Child One')).not.toBeInTheDocument();
    });

    it('sets aria-expanded=true on expanded parent', () => {
        render(<TreeView nodes={nestedNodes} />);
        const parentItem = screen.getByRole('treeitem', { name: /Root One/ });
        expect(parentItem).toHaveAttribute('aria-expanded', 'false');

        fireEvent.click(screen.getByRole('button', { name: 'Expand' }));
        expect(parentItem).toHaveAttribute('aria-expanded', 'true');
    });

    it('respects defaultExpandedIds', () => {
        render(<TreeView nodes={nestedNodes} defaultExpandedIds={['root1']} />);
        expect(screen.getByText('Child One')).toBeInTheDocument();
    });

    it('shows nested children after parent is expanded', () => {
        render(<TreeView nodes={deepNodes} />);
        // Expand parent
        fireEvent.click(screen.getByRole('button', { name: 'Expand' }));
        expect(screen.getByText('Child')).toBeInTheDocument();
        // Grandchild not yet visible (child is also collapsed)
        expect(screen.queryByText('Grandchild')).not.toBeInTheDocument();
        // Expand child
        fireEvent.click(screen.getByRole('button', { name: 'Expand' }));
        expect(screen.getByText('Grandchild')).toBeInTheDocument();
    });

    // --- Selection ---

    it('calls onSelect with the correct node when label is clicked', () => {
        const onSelect = vi.fn();
        render(<TreeView nodes={simpleNodes} onSelect={onSelect} />);
        fireEvent.click(screen.getByText('Beta'));
        expect(onSelect).toHaveBeenCalledOnce();
        expect(onSelect).toHaveBeenCalledWith(simpleNodes[1]);
    });

    it('highlights the selected node via selectedId prop', () => {
        render(<TreeView nodes={simpleNodes} selectedId="b" />);
        const betaItem = screen.getByRole('treeitem', { name: /Beta/ });
        expect(betaItem).toHaveAttribute('aria-selected', 'true');
    });

    it('does not highlight unselected nodes', () => {
        render(<TreeView nodes={simpleNodes} selectedId="b" />);
        const alphaItem = screen.getByRole('treeitem', { name: /Alpha/ });
        expect(alphaItem).toHaveAttribute('aria-selected', 'false');
    });

    // --- Disabled nodes ---

    it('does not call onSelect for a disabled node', () => {
        const onSelect = vi.fn();
        const nodes: TreeNode[] = [{ id: 'x', label: 'Disabled', disabled: true }];
        render(<TreeView nodes={nodes} onSelect={onSelect} />);
        fireEvent.click(screen.getByText('Disabled'));
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('sets aria-disabled on a disabled node', () => {
        const nodes: TreeNode[] = [{ id: 'x', label: 'Disabled', disabled: true }];
        render(<TreeView nodes={nodes} />);
        const item = screen.getByRole('treeitem', { name: /Disabled/ });
        expect(item).toHaveAttribute('aria-disabled', 'true');
    });

    it('does not set aria-disabled on enabled nodes', () => {
        render(<TreeView nodes={simpleNodes} />);
        const item = screen.getByRole('treeitem', { name: /Alpha/ });
        expect(item).not.toHaveAttribute('aria-disabled');
    });

    // --- Keyboard navigation ---

    it('ArrowDown moves focus to the next node', () => {
        render(<TreeView nodes={simpleNodes} />);
        const tree = screen.getByRole('tree');
        // Click first item to focus it
        fireEvent.click(screen.getByText('Alpha'));
        fireEvent.keyDown(tree, { key: 'ArrowDown' });
        expect(document.activeElement).toHaveAttribute('data-node-id', 'b');
    });

    it('ArrowUp moves focus to the previous node', () => {
        render(<TreeView nodes={simpleNodes} />);
        const tree = screen.getByRole('tree');
        fireEvent.click(screen.getByText('Beta'));
        fireEvent.keyDown(tree, { key: 'ArrowUp' });
        expect(document.activeElement).toHaveAttribute('data-node-id', 'a');
    });

    it('ArrowRight expands a collapsed node', () => {
        render(<TreeView nodes={nestedNodes} />);
        const tree = screen.getByRole('tree');
        fireEvent.click(screen.getByText('Root One'));
        fireEvent.keyDown(tree, { key: 'ArrowRight' });
        expect(screen.getByText('Child One')).toBeInTheDocument();
    });

    it('ArrowLeft collapses an expanded node', () => {
        render(<TreeView nodes={nestedNodes} defaultExpandedIds={['root1']} />);
        const tree = screen.getByRole('tree');
        fireEvent.click(screen.getByText('Root One'));
        fireEvent.keyDown(tree, { key: 'ArrowLeft' });
        expect(screen.queryByText('Child One')).not.toBeInTheDocument();
    });

    it('Enter selects the focused node', () => {
        const onSelect = vi.fn();
        render(<TreeView nodes={simpleNodes} onSelect={onSelect} />);
        const tree = screen.getByRole('tree');
        fireEvent.click(screen.getByText('Beta'));
        fireEvent.keyDown(tree, { key: 'Enter' });
        expect(onSelect).toHaveBeenCalledWith(simpleNodes[1]);
    });

    it('Enter does not select a disabled focused node', () => {
        const onSelect = vi.fn();
        const nodes: TreeNode[] = [
            { id: 'x', label: 'Disabled', disabled: true },
            { id: 'y', label: 'Enabled' },
        ];
        render(<TreeView nodes={nodes} onSelect={onSelect} />);
        const tree = screen.getByRole('tree');
        // Focus the disabled node by clicking it (won't select, but sets focus)
        fireEvent.click(screen.getByText('Disabled'));
        fireEvent.keyDown(tree, { key: 'Enter' });
        expect(onSelect).not.toHaveBeenCalled();
    });

    // --- Controlled expand ---

    it('uses expandedIds in controlled mode', () => {
        render(<TreeView nodes={nestedNodes} expandedIds={['root1']} />);
        expect(screen.getByText('Child One')).toBeInTheDocument();
    });

    it('calls onExpandChange when chevron is clicked in controlled mode', () => {
        const onExpandChange = vi.fn();
        render(
            <TreeView
                nodes={nestedNodes}
                expandedIds={[]}
                onExpandChange={onExpandChange}
            />
        );
        fireEvent.click(screen.getByRole('button', { name: 'Expand' }));
        expect(onExpandChange).toHaveBeenCalledOnce();
        expect(onExpandChange).toHaveBeenCalledWith('root1', true);
    });

    it('calls onExpandChange with false when collapsing in controlled mode', () => {
        const onExpandChange = vi.fn();
        render(
            <TreeView
                nodes={nestedNodes}
                expandedIds={['root1']}
                onExpandChange={onExpandChange}
            />
        );
        fireEvent.click(screen.getByRole('button', { name: 'Collapse' }));
        expect(onExpandChange).toHaveBeenCalledWith('root1', false);
    });

    // --- Icons ---

    it('renders icon when provided', () => {
        const nodes: TreeNode[] = [{ id: 'a', label: 'With Icon', icon: <span data-testid="my-icon" /> }];
        render(<TreeView nodes={nodes} />);
        expect(screen.getByTestId('my-icon')).toBeInTheDocument();
    });

    // --- Leaf nodes ---

    it('leaf nodes do not have aria-expanded', () => {
        render(<TreeView nodes={simpleNodes} />);
        const item = screen.getByRole('treeitem', { name: /Alpha/ });
        expect(item).not.toHaveAttribute('aria-expanded');
    });
});
