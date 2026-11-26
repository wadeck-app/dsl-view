import * as RadixPopover from '@radix-ui/react-popover';
import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface HoverCardRow {
	label: string;
	value: React.ReactNode;
}

export interface HoverCardProps {
	/** Labelled rows (label on the left, value on the right): the structured part of the card. Shown before `content`. */
	rows?: HoverCardRow[];
	/** Free content shown after the rows. Not interactive: the card never takes the pointer or the focus. */
	content?: React.ReactNode;
	side?: 'top' | 'right' | 'bottom' | 'left';
	align?: 'start' | 'center' | 'end';
	/** Milliseconds the pointer must rest on the trigger before the card opens. Keyboard focus opens it at once. Default 400. */
	delay?: number;
	/** Never opens. */
	disabled?: boolean;
	/** @slot tag:atomic, tag:composite */
	children: React.ReactNode;
}

// Only one card is open at a time: opening one closes the one that was open.
let closeOpenCard: (() => void) | null = null;

const cardClass =
	'pointer-events-none z-50 max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-xs text-content shadow-lg';

/**
 * A rich tooltip: labelled rows and free content, portaled and kept inside the viewport (flips and shifts).
 * Opens after a hover delay or on keyboard focus; closes on leave, blur, Escape and scroll.
 * Use it where a text-only `Tooltip` is too small; for interactive content use `Popover`.
 * @registryCategory disposition
 * @registryTags hover card tooltip rich details
 * @uiexception hover-only - like Tooltip, a hover card is intentionally transient detail on demand; it opens on keyboard focus too.
 */
export function HoverCard({ rows, content, side = 'top', align = 'center', delay = 400, disabled = false, children }: HoverCardProps) {
	const id = React.useId();
	const [open, setOpen] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
	const closeSelf = useRef<() => void>(close);
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
		// Capture: scroll does not bubble, and any scrolling ancestor moves the trigger away from the card.
		document.addEventListener('keydown', onKey);
		window.addEventListener('scroll', close, true);
		return () => {
			document.removeEventListener('keydown', onKey);
			window.removeEventListener('scroll', close, true);
		};
	}, [open, close]);

	useEffect(() => close, [close]);

	useEffect(() => {
		if (disabled) {
			close();
		}
	}, [disabled, close]);

	const described = React.isValidElement<{ 'aria-describedby'?: string }>(children)
		? React.cloneElement(children, {
				'aria-describedby': [children.props['aria-describedby'], id].filter(Boolean).join(' '),
			})
		: children;

	return (
		<RadixPopover.Root open={open && !disabled}>
			<RadixPopover.Anchor asChild>
				<span
					style={{ display: 'inline-flex' }}
					onPointerEnter={event => {
						// A touch has no hover: the card would open on every tap and stay.
						if (disabled || event.pointerType === 'touch') {
							return;
						}
						clearTimer();
						timer.current = setTimeout(show, delay);
					}}
					onPointerLeave={close}
					onFocus={() => {
						if (!disabled) {
							show();
						}
					}}
					onBlur={close}
				>
					{described}
				</span>
			</RadixPopover.Anchor>
			<RadixPopover.Portal>
				<RadixPopover.Content
					id={id}
					role="tooltip"
					side={side}
					align={align}
					sideOffset={6}
					collisionPadding={8}
					// The card describes the trigger: the focus stays where it is, before and after.
					onOpenAutoFocus={event => event.preventDefault()}
					onCloseAutoFocus={event => event.preventDefault()}
					className={cardClass}
					data-testid="hover-card"
				>
					{rows && rows.length > 0 && (
						<dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
							{rows.map(row => (
								<React.Fragment key={row.label}>
									<dt className="text-muted">{row.label}</dt>
									<dd className="text-right">{row.value}</dd>
								</React.Fragment>
							))}
						</dl>
					)}
					{content !== undefined && <div className={rows && rows.length > 0 ? 'mt-1.5' : undefined}>{content}</div>}
				</RadixPopover.Content>
			</RadixPopover.Portal>
		</RadixPopover.Root>
	);
}
