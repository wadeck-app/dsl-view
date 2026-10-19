import '@testing-library/jest-dom';

// Radix primitives use ResizeObserver internally
(globalThis as typeof globalThis & { ResizeObserver: unknown }).ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

// Radix Popover / Dialog use requestAnimationFrame for focus management.
// JSDOM provides a stub that never fires, causing userEvent interactions to hang in CI.
// Flush the callback synchronously so focus traps resolve without real timers.
globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
    cb(performance.now());
    return 0;
};

// jsdom has no 2D canvas and logs "Not implemented" on every getContext(). useOpticalCenter measures glyphs with a
// canvas and, without one, leaves the text at its default centering. Tests that need metrics replace this per test
// and restore it afterwards.
HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
