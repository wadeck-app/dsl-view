import { useEffect, useState } from 'react';

/**
 * Measured width (px, rounded down) of an element: 0 until measured. Returns a callback ref, not a ref object: the element
 * may mount after the first render (a chart that shows a placeholder while its data loads), and an effect that ran once on an
 * empty ref object would never measure it. The third value is the element itself, for the pointer handlers of the caller.
 */
export function useElementWidth(): [(element: HTMLElement | null) => void, number, HTMLElement | null] {
	const [element, setElement] = useState<HTMLElement | null>(null);
	const [width, setWidth] = useState(0);
	useEffect(() => {
		if (!element) {
			return;
		}
		setWidth(Math.floor(element.getBoundingClientRect().width));
		const observer = new ResizeObserver(entries => {
			const first = entries[0];
			if (first) {
				setWidth(Math.floor(first.contentRect.width));
			}
		});
		observer.observe(element);
		return () => observer.disconnect();
	}, [element]);
	return [setElement, width, element];
}
