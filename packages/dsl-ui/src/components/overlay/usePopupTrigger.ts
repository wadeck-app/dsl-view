import { useEffect, useRef } from 'react';

const FOCUSABLE = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Radix anchors a popup on a wrapper span around the trigger. The wrapper cannot take focus and is not what
 * assistive technology lands on, so two things go wrong without help: closing the popup returns focus to the
 * wrapper (the user ends up on <body>), and `aria-expanded` / `aria-haspopup` sit on the wrapper instead of on the
 * control. A trigger is often a component that forwards no props (a kebab button), so the attributes are set on the
 * DOM node of the focusable control inside the wrapper.
 *
 * Spread `ref` on the wrapper span and pass `onCloseAutoFocus` to the Radix `Content`.
 */
export function usePopupTrigger(open: boolean, popup: 'menu' | 'dialog') {
	const ref = useRef<HTMLSpanElement>(null);

	function control() {
		return ref.current?.querySelector<HTMLElement>(FOCUSABLE) ?? null;
	}

	// No dependency list on purpose: the trigger element can be swapped by a parent render without `open` changing.
	useEffect(() => {
		const element = ref.current?.querySelector<HTMLElement>(FOCUSABLE);
		element?.setAttribute('aria-haspopup', popup);
		element?.setAttribute('aria-expanded', String(open));
	});

	return {
		ref,
		onCloseAutoFocus: (event: Event) => {
			event.preventDefault();
			control()?.focus();
		},
	};
}
