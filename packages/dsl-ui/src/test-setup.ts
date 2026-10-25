import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';

import { resetReportedMessages } from '@dsl-ui/components/dev/reportOnce.js';

// jsdom loads no stylesheet, so the theme token is absent. Define it so suites do not print the missing-token warning;
// onSolidToken.test.ts removes it on purpose.
document.documentElement.style.setProperty('--color-on-solid', '#ffffff');

// A test that fails before its own `vi.useRealTimers()` would leave fake timers installed for every
// following test in the file; always go back to the real clock. Persisted state (the A/B dock, filters, theme)
// and the URL are also reset so one test cannot pre-seed the next one.
afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState(null, '', '/');
    // Once-per-message reports (authoring warnings) are remembered per module: without this a report made by one test
    // silences the same report in the next one and passes or fails depending on the order.
    resetReportedMessages();
});

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
