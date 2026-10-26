/**
 * Why the bar height is driven from JavaScript, frame by frame.
 *
 * `--app-shell-bar-height` is read by the bar itself, the sticky side menu, the dock and any sticky bar of the host. A
 * plain custom property is not animatable (it flips at once), so each consumer would animate on its own, with its own
 * duration and start time, and a one-frame gap opens between the bar and what sticks under it. An `@property`
 * registration would make the variable animatable, but only where the transition is declared (the document root, which
 * the host owns, and the shell root: two clocks that start in different frames), and every consumer that ALSO has a
 * `transition: top` would chase the moving value with a lag. Writing one number per frame to every place that declares
 * the variable keeps them identical by construction, works in every browser (no `@property`), and the controller below
 * is testable with fake timers.
 */

/** Same duration as the CSS transitions on the bar's padding, gap and font size (Tailwind `duration-200`). */
export const BAR_MOTION_MS = 200;

// Tailwind's `ease-out`: cubic-bezier(0, 0, 0.2, 1). Same curve as the CSS transitions around it.
const X1 = 0;
const Y1 = 0;
const X2 = 0.2;
const Y2 = 1;

const bezier = (a: number, b: number, t: number): number => 3 * a * (1 - t) * (1 - t) * t + 3 * b * (1 - t) * t * t + t * t * t;

/** Progress (0..1) of the CSS `ease-out` curve at time fraction `t` (0..1). */
export function easeOut(t: number): number {
	if (t <= 0) {
		return 0;
	}
	if (t >= 1) {
		return 1;
	}
	// Solve x(s) = t for the curve parameter s (bisection: monotonic because the control x values are in [0, 1]).
	let low = 0;
	let high = 1;
	for (let i = 0; i < 24; i += 1) {
		const mid = (low + high) / 2;
		if (bezier(X1, X2, mid) < t) {
			low = mid;
		} else {
			high = mid;
		}
	}
	return bezier(Y1, Y2, (low + high) / 2);
}

export interface BarHeightMotion {
	/** The last value written, in rem. */
	readonly value: number;
	/** Go to `target` (rem). `animate: false` writes it at once. A running motion continues from where it is. */
	go(target: number, animate: boolean): void;
	/** Cancel the pending frame; the value reached stays. */
	stop(): void;
}

/**
 * Animates a length in rem towards a target with the ease-out curve over BAR_MOTION_MS. `apply` receives every value
 * (the target itself on the last frame, so no rounding error remains). Nothing is written synchronously by an animated
 * `go`: the old value stays until the first frame.
 */
export function createBarHeightMotion(initial: number, apply: (rem: number) => void): BarHeightMotion {
	let value = initial;
	let target = initial;
	let frame = 0;
	let from = initial;
	let startedAt: number | undefined;

	const cancel = () => {
		if (frame !== 0) {
			cancelAnimationFrame(frame);
			frame = 0;
		}
	};
	const write = (next: number) => {
		value = next;
		apply(next);
	};
	const tick = (now: number) => {
		frame = 0;
		startedAt ??= now;
		const t = (now - startedAt) / BAR_MOTION_MS;
		if (t >= 1) {
			write(target);
			return;
		}
		write(from + (target - from) * easeOut(t));
		frame = requestAnimationFrame(tick);
	};

	return {
		get value() {
			return value;
		},
		go(next, animate) {
			if (next === target && frame === 0 && value === next) {
				return;
			}
			cancel();
			target = next;
			if (!animate) {
				write(next);
				return;
			}
			from = value;
			startedAt = undefined;
			frame = requestAnimationFrame(tick);
		},
		stop: cancel,
	};
}
