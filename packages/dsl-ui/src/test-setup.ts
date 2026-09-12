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
