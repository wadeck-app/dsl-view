import * as RadixPopover from '@radix-ui/react-popover';
import React, { useCallback, useEffect, useRef, useState } from 'react';

// @formatter:off
// Intentionally theme-invariant (always dark bg + white text, unlike other
// surfaces which flip with the .dark class) - matches the pre-migration raw
// palette colors which had no dark-mode variant. Arbitrary hex values keep
// exact visual parity without introducing a new semantic token.
// The ring gives the card an edge on a dark page, where the dark surface alone disappears.
const cardClass = 'pointer-events-none z-50 w-max rounded bg-[#111827] px-2 py-1 text-xs text-white ring-1 ring-white/15 whitespace-normal';
// Full class names: Tailwind reads the source text.
const MAX_WIDTH = { xs: 'max-w-xs', sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' } as const;
const CLAMP = { 1: 'line-clamp-1', 2: 'line-clamp-2', 3: 'line-clamp-3', 4: 'line-clamp-4' } as const;
const arrowClass = 'fill-[#111827]';
// @formatter:on

export interface TooltipRow {
	label: string;
	value: React.ReactNode;
	/** Cut the value after this many lines (1 to 4) with an ellipsis; the full text stays available to assistive technology. */
	clamp?: 1 | 2 | 3 | 4;
}

export interface TooltipProps {
	/** The text, or any content, of the tooltip. Not interactive: the card never takes the pointer or the focus. */
	content?: React.ReactNode;
	/** Labelled rows (label on the left, value on the right) for structured details; shown before `content`. */
	rows?: TooltipRow[];
	/** Widest the card may grow: xs 320px (default), sm 384px, md 448px, lg 512px. */
	maxWidth?: keyof typeof MAX_WIDTH;
	side?: 'top' | 'right' | 'bottom' | 'left';
	align?: 'start' | 'center' | 'end';
	/** Milliseconds the pointer must rest on the trigger before the card opens (keyboard focus opens it at once). Default 300. */
	delay?: number;
	/**
	 * Whether the trigger is described by the tooltip text for assistive technology (default true). Turn it off when the
	 * tooltip repeats the trigger's own accessible name (an icon button labelled by the same text).
	 */
	describe?: boolean;
	/** Extra classes for the wrapper span (a module sizes it). */
	className?: string;
	/** Data attributes are passed to the wrapper span too (a module targets it). */
	[dataAttribute: `data-${string}`]: string | undefined;
	/** @slot tag:atomic, tag:composite */
	children: React.ReactNode;
}

// Only one card is open at a time: opening one closes the one that was open.
let closeOpenCard: (() => void) | null = null;

// A click or a tap focuses a button without the user having moved by keyboard: the card then comes from the hover only.
function focusIsFromKeyboard(target: EventTarget): boolean {
	if (!(target instanceof Element)) {
		return true;
	}
	try {
		return target.matches(':focus-visible');
	} catch {
		return true;
	}
}

function Details({ rows, content }: Pick<TooltipProps, 'rows' | 'content'>) {
	const hasRows = rows !== undefined && rows.length > 0;
	return (
		<>
			{hasRows && (
				<dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-left">
					{rows.map(row => (
						<React.Fragment key={row.label}>
							<dt className="text-white/70">{row.label}</dt>
							<dd className={['min-w-0 text-left [overflow-wrap:anywhere]', row.clamp ? CLAMP[row.clamp] : ''].filter(Boolean).join(' ')}>{row.value}</dd>
						</React.Fragment>
					))}
				</dl>
			)}
			{content !== undefined && content !== null && <div className={hasRows ? 'mt-1.5' : 'text-center'}>{content}</div>}
		</>
	);
}

/**
 * A hint shown next to a single wrapped element. The card is portaled to the body and kept inside the viewport (it flips and
 * shifts), so an ancestor with `overflow` never clips it. It opens after a short hover delay or on keyboard focus, and closes
 * on leave, blur, click, Escape and scroll. `content` can be text or any node; `rows` gives labelled details.
 * @registryCategory disposition
 * @registryTags tooltip hover card rows details
 * @uiexception hover-only - Tooltips are intentionally hover-triggered; they cannot be permanently visible without defeating their purpose (screen real estate and visual noise). This is the sole accepted exception to UX §6.
 */
export function Tooltip({ content, rows, maxWidth = 'xs', side = 'top', align = 'center', delay = 300, describe = true, className, children, ...dataAttributes }: TooltipProps) {
	const anchorRef = useRef<HTMLSpanElement>(null);
	const id = React.useId();
	const [open, setOpen] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const closeSelf = useRef<() => void>(() => undefined);

	const clearTimer = () => {
		if (timer.current !== null) {
			clearTimeout(timer.current);
			timer.current = null;
		}
	};
	const close = useCallback(() => {
		clearTimer();
		setOpen(false);
		if (closeOpenCard === closeSelf.current) {
			closeOpenCard = null;
		}
	}, []);
	closeSelf.current = close;

	const show = () => {
		clearTimer();
		if (closeOpenCard && closeOpenCard !== closeSelf.current) {
			closeOpenCard();
		}
		closeOpenCard = closeSelf.current;
		setOpen(true);
	};

	useEffect(() => {
		if (!open) {
			return;
		}
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				close();
			}
		};
		// Capture: scroll does not bubble. Only a scroll that moves the trigger closes the card (the page, or an ancestor of the
		// trigger): a log scrolling elsewhere, live, must not.
		const onScroll = (event: Event) => {
			const target = event.target;
			if (!(target instanceof Element) || anchorRef.current === null || target.contains(anchorRef.current)) {
				close();
			}
		};
		document.addEventListener('keydown', onKey);
		window.addEventListener('scroll', onScroll, true);
		return () => {
			document.removeEventListener('keydown', onKey);
			window.removeEventListener('scroll', onScroll, true);
		};
	}, [open, close]);

	// Unmounting while open (or waiting for the delay) must not leave a timer or the "current card" behind.
	useEffect(() => close, [close]);

	const nothingToShow = (content === undefined || content === null || content === '') && (rows === undefined || rows.length === 0);

	// A hover-only tooltip never reaches a keyboard or screen-reader user by itself, and the main use is a DISABLED
	// button ("why can't I click this"), which cannot take focus: point the wrapped element at the tooltip so its text
	// is the element's accessible description. Only a single element child can be described; anything else is left as is.
	const described =
		describe && !nothingToShow && React.isValidElement<{ 'aria-describedby'?: string }>(children)
			? React.cloneElement(children, {
					'aria-describedby': [children.props['aria-describedby'], id].filter(Boolean).join(' '),
				})
			: children;

	return (
		<RadixPopover.Root open={open && !nothingToShow}>
			<RadixPopover.Anchor asChild>
				<span
					{...dataAttributes}
					className={className ? `inline-flex ${className}` : 'inline-flex'}
					onPointerEnter={event => {
						// A touch has no hover: the card would open on every tap and stay.
						if (event.pointerType === 'touch') {
							return;
						}
						// The anchor Radix positions against takes its own ref; the wrapper is remembered from the events instead.
						anchorRef.current = event.currentTarget;
						clearTimer();
						timer.current = setTimeout(show, delay);
					}}
					onPointerLeave={close}
					onPointerDown={close}
					onClick={close}
					onFocus={event => {
						anchorRef.current = event.currentTarget;
						if (focusIsFromKeyboard(event.target)) {
							show();
						}
					}}
					onBlur={close}
				>
					{described}
				</span>
			</RadixPopover.Anchor>
			{describe && !nothingToShow && (
				// Always in the page, for assistive technology: a disabled trigger is never hovered or focused.
				<span id={id} role="tooltip" className="sr-only">
					<Details rows={rows} content={content} />
				</span>
			)}
			<RadixPopover.Portal>
				<RadixPopover.Content
					aria-hidden="true"
					side={side}
					align={align}
					sideOffset={6}
					collisionPadding={8}
					// The card describes the trigger: the focus stays where it is, before and after.
					onOpenAutoFocus={event => event.preventDefault()}
					onCloseAutoFocus={event => event.preventDefault()}
					className={`${cardClass} ${MAX_WIDTH[maxWidth]}`}
					data-testid="tooltip-card"
				>
					<Details rows={rows} content={content} />
					<RadixPopover.Arrow className={arrowClass} />
				</RadixPopover.Content>
			</RadixPopover.Portal>
		</RadixPopover.Root>
	);
}
