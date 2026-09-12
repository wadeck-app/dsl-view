import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';

export interface TreeNode {
    id: string;
    label: string;
    icon?: React.ReactNode;
    children?: TreeNode[];
    disabled?: boolean;
    data?: unknown;
}

export interface TreeViewProps {
    nodes: TreeNode[];
    onSelect?: (node: TreeNode) => void;
    selectedId?: string;
    defaultExpandedIds?: string[];
    /** Controlled expanded IDs — pair with onExpandChange */
    expandedIds?: string[];
    onExpandChange?: (id: string, expanded: boolean) => void;
    className?: string;
}

function getVisibleNodes(nodes: TreeNode[], expandedSet: Set<string>): TreeNode[] {
    const result: TreeNode[] = [];
    function walk(items: TreeNode[]) {
        for (const node of items) {
            result.push(node);
            if (node.children?.length && expandedSet.has(node.id)) {
                walk(node.children);
            }
        }
    }
    walk(nodes);
    return result;
}

function buildParentMap(nodes: TreeNode[], map: Map<string, string> = new Map(), parentId: string | null = null): Map<string, string> {
    for (const node of nodes) {
        if (parentId !== null) map.set(node.id, parentId);
        if (node.children?.length) buildParentMap(node.children, map, node.id);
    }
    return map;
}

/**
 * @registryCategory composite
 * @registryTags tree treeview hierarchy expandable
 */
export function TreeView({
    nodes,
    onSelect,
    selectedId,
    defaultExpandedIds = [],
    expandedIds,
    onExpandChange,
    className,
}: TreeViewProps) {
    const isControlled = expandedIds !== undefined;
    const [internalExpanded, setInternalExpanded] = useState<Set<string>>(
        () => new Set(defaultExpandedIds)
    );
    const [focusedId, setFocusedId] = useState<string | null>(null);
    const treeRef = useRef<HTMLUListElement>(null);

    const expandedSet = useMemo(
        () => (isControlled ? new Set(expandedIds) : internalExpanded),
        [isControlled, expandedIds, internalExpanded]
    );

    const parentMap = useMemo(() => buildParentMap(nodes), [nodes]);

    const toggleExpand = useCallback(
        (node: TreeNode) => {
            const isExpanded = expandedSet.has(node.id);
            if (isControlled) {
                onExpandChange?.(node.id, !isExpanded);
            } else {
                setInternalExpanded(prev => {
                    const next = new Set(prev);
                    if (isExpanded) {
                        next.delete(node.id);
                    } else {
                        next.add(node.id);
                    }
                    return next;
                });
            }
        },
        [expandedSet, isControlled, onExpandChange]
    );

    const focusNode = useCallback((nodeId: string) => {
        setFocusedId(nodeId);
        treeRef.current
            ?.querySelector<HTMLElement>(`[data-node-id="${nodeId}"]`)
            ?.focus();
    }, []);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLUListElement>) => {
            const visibleNodes = getVisibleNodes(nodes, expandedSet);
            if (visibleNodes.length === 0) return;

            const currentIndex = focusedId
                ? visibleNodes.findIndex(n => n.id === focusedId)
                : -1;
            const current = currentIndex >= 0 ? visibleNodes[currentIndex] : null;

            switch (e.key) {
                case 'ArrowDown': {
                    e.preventDefault();
                    const nextIndex =
                        currentIndex < 0 ? 0 : Math.min(currentIndex + 1, visibleNodes.length - 1);
                    const next = visibleNodes[nextIndex];
                    if (next) focusNode(next.id);
                    break;
                }
                case 'ArrowUp': {
                    e.preventDefault();
                    if (currentIndex <= 0) break;
                    const prev = visibleNodes[currentIndex - 1];
                    if (prev) focusNode(prev.id);
                    break;
                }
                case 'ArrowRight': {
                    e.preventDefault();
                    if (current && current.children?.length && !expandedSet.has(current.id)) {
                        toggleExpand(current);
                    }
                    break;
                }
                case 'ArrowLeft': {
                    e.preventDefault();
                    if (current && current.children?.length && expandedSet.has(current.id)) {
                        // Collapse open parent node
                        toggleExpand(current);
                    } else if (current) {
                        // Leaf or already-collapsed: move focus to parent (WAI-ARIA 1.1)
                        const parentId = parentMap.get(current.id);
                        if (parentId) focusNode(parentId);
                    }
                    break;
                }
                case 'Enter': {
                    e.preventDefault();
                    if (current && !current.disabled) {
                        onSelect?.(current);
                    }
                    break;
                }
            }
        },
        [nodes, expandedSet, focusedId, focusNode, toggleExpand, onSelect, parentMap]
    );

    return (
        <ul
            ref={treeRef}
            role="tree"
            className={['select-none outline-none', className].filter(Boolean).join(' ')}
            onKeyDown={handleKeyDown}
        >
            {nodes.map((node, index) => (
                <TreeNodeItem
                    key={node.id}
                    node={node}
                    depth={0}
                    isInitialFocusTarget={index === 0}
                    expandedSet={expandedSet}
                    selectedId={selectedId}
                    focusedId={focusedId}
                    onSelect={onSelect}
                    onToggleExpand={toggleExpand}
                    onFocus={focusNode}
                />
            ))}
        </ul>
    );
}

interface TreeNodeItemProps {
    node: TreeNode;
    depth: number;
    /** Only true for the very first top-level node — initial keyboard tab stop */
    isInitialFocusTarget: boolean;
    expandedSet: Set<string>;
    selectedId?: string;
    focusedId: string | null;
    onSelect?: (node: TreeNode) => void;
    onToggleExpand: (node: TreeNode) => void;
    onFocus: (id: string) => void;
}

function TreeNodeItem({
    node,
    depth,
    isInitialFocusTarget,
    expandedSet,
    selectedId,
    focusedId,
    onSelect,
    onToggleExpand,
    onFocus,
}: TreeNodeItemProps) {
    const hasChildren = Boolean(node.children?.length);
    const isExpanded = expandedSet.has(node.id);
    const isSelected = selectedId === node.id;
    const isDisabled = node.disabled === true;

    // Roving tabIndex: focused node (or initial tab stop when nothing focused) gets 0
    const tabIndex = focusedId
        ? (focusedId === node.id ? 0 : -1)
        : (isInitialFocusTarget ? 0 : -1);

    const indentStyle = { paddingLeft: `${depth * 16 + 4}px` };

    const rowClass = [
        'flex items-center gap-1 h-7 pr-2 rounded text-sm outline-none',
        'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary-solid)]',
        isDisabled
            ? 'opacity-50 cursor-not-allowed text-muted'
            : isSelected
                ? 'bg-[var(--color-primary-solid)] text-white cursor-pointer'
                : 'text-content hover:bg-muted-bg cursor-pointer',
    ]
        .filter(Boolean)
        .join(' ');

    function handleRowClick() {
        onFocus(node.id);
        if (!isDisabled) {
            onSelect?.(node);
        }
    }

    function handleChevronClick(e: React.MouseEvent) {
        e.stopPropagation();
        onFocus(node.id);
        onToggleExpand(node);
    }

    return (
        <li
            role="treeitem"
            aria-expanded={hasChildren ? isExpanded : undefined}
            aria-selected={isSelected}
            aria-disabled={isDisabled || undefined}
        >
            <div
                className={rowClass}
                style={indentStyle}
                tabIndex={tabIndex}
                data-node-id={node.id}
                onClick={handleRowClick}
                onFocus={() => onFocus(node.id)}
            >
                {/* Chevron or spacer for indentation alignment */}
                {hasChildren ? (
                    <button
                        type="button"
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        tabIndex={-1}
                        className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded text-muted hover:text-content focus:outline-none"
                        onClick={handleChevronClick}
                    >
                        <ChevronRight
                            className={[
                                'h-3.5 w-3.5 transition-transform duration-150',
                                isExpanded ? 'rotate-90' : '',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                            aria-hidden="true"
                        />
                    </button>
                ) : (
                    // Spacer to align leaf nodes with parent labels
                    <span className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                )}

                {/* Optional icon */}
                {node.icon !== undefined && (
                    <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center" aria-hidden="true">
                        {node.icon}
                    </span>
                )}

                {/* Label */}
                <span className="truncate">{node.label}</span>
            </div>

            {/* Children group */}
            {hasChildren && isExpanded && (
                <ul role="group">
                    {node.children!.map(child => (
                        <TreeNodeItem
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            isInitialFocusTarget={false}
                            expandedSet={expandedSet}
                            selectedId={selectedId}
                            focusedId={focusedId}
                            onSelect={onSelect}
                            onToggleExpand={onToggleExpand}
                            onFocus={onFocus}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
}
