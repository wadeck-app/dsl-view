import '@testing-library/jest-dom';

// Radix Slider (and other Radix primitives) uses ResizeObserver internally
(globalThis as typeof globalThis & { ResizeObserver: unknown }).ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};
