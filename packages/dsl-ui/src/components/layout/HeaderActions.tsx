import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { reportAuthoringMistake } from '@dsl-ui/utils/devDiagnostics.js';

interface HeaderActionsContextValue {
	// State, so the actions render as soon as the slot exists.
	slot: HTMLElement | null;
	// Set synchronously when the slot attaches: an effect of an actions component can tell "no slot at all" from "slot not rendered yet".
	slotRef: React.MutableRefObject<HTMLElement | null>;
	setSlot: (el: HTMLElement | null) => void;
	// Number of contents currently portaled into the slot.
	filledCount: number;
	// Called by a content while it is mounted in the slot; returns the unregister.
	register: () => () => void;
}

const HeaderActionsContext = createContext<HeaderActionsContextValue | null>(null);

/** The host (the app shell) wraps the page once. It owns no markup. */
export function HeaderActionsProvider({ children }: { children: React.ReactNode }) {
	const [slot, setSlotState] = useState<HTMLElement | null>(null);
	const slotRef = useRef<HTMLElement | null>(null);
	const setSlot = useCallback((el: HTMLElement | null) => {
		slotRef.current = el;
		setSlotState(el);
	}, []);
	const [filledCount, setFilledCount] = useState(0);
	const register = useCallback(() => {
		setFilledCount(count => count + 1);
		return () => setFilledCount(count => count - 1);
	}, []);
	const value = useMemo(() => ({ slot, slotRef, setSlot, filledCount, register }), [slot, setSlot, filledCount, register]);
	return <HeaderActionsContext.Provider value={value}>{children}</HeaderActionsContext.Provider>;
}

export interface HeaderActionsSlotProps {
	/** Placement is the host's: put it in the title row, and add `sticky`/`top-*` classes for the breadcrumb row. */
	className?: string;
}

/** Rendered by the host where the page's header actions go (the title row). A flex row; one slot per provider. */
export function HeaderActionsSlot({ className }: HeaderActionsSlotProps) {
	const ctx = useContext(HeaderActionsContext);
	const setSlot = ctx?.setSlot;
	const attach = useCallback((el: HTMLDivElement | null) => setSlot?.(el), [setSlot]);
	useEffect(() => {
		if (!ctx) {
			reportAuthoringMistake('[HeaderActionsSlot] no HeaderActionsProvider above it: the actions of a page cannot reach it. Wrap the shell in <HeaderActionsProvider>.');
		}
	}, [ctx]);
	return <div ref={attach} data-testid="header-actions-slot" data-filled={ctx ? String(ctx.filledCount > 0) : 'false'} className={['flex items-center gap-2', className].filter(Boolean).join(' ')} />;
}

/** True while something is portaled into the slot, so the shell can hide its own crumb or change its row layout only then. False without a provider. */
export function useHeaderActionsFilled(): boolean {
	const ctx = useContext(HeaderActionsContext);
	return (ctx?.filledCount ?? 0) > 0;
}

/** True when a provider is above and its slot is mounted. Internal: lets a component choose between the slot and its own place. */
export function useHasHeaderActionsSlot(): boolean {
	return useContext(HeaderActionsContext)?.slot != null;
}

/**
 * Rendered by a page or module: its children appear in the host's `HeaderActionsSlot` (in the title row), with no measuring and
 * no fixed offsets. Nothing is rendered where this component is written. Without a provider or a slot nothing is shown, and that
 * is reported once in development.
 */
export function HeaderActions({ children }: { children: React.ReactNode }) {
	const ctx = useContext(HeaderActionsContext);
	const slotRef = ctx?.slotRef;
	useEffect(() => {
		if (!ctx) {
			reportAuthoringMistake('[HeaderActions] no HeaderActionsProvider above it: the actions are not shown. The host must wrap the shell in <HeaderActionsProvider> and render a <HeaderActionsSlot> in the title row.');
		} else if (!slotRef?.current) {
			reportAuthoringMistake('[HeaderActions] no HeaderActionsSlot is mounted: the actions are not shown. The host must render a <HeaderActionsSlot> in the title row.');
		}
	}, [ctx, slotRef]);
	const register = ctx?.register;
	const hasSlot = ctx?.slot != null;
	useEffect(() => (hasSlot ? register?.() : undefined), [hasSlot, register]);
	if (!ctx?.slot) {
		return null;
	}
	return createPortal(children, ctx.slot);
}
