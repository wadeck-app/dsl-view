import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';

// A test that fails before its own `vi.useRealTimers()` would leave fake timers installed for every
// following test in the file; always go back to the real clock.
afterEach(() => {
	vi.useRealTimers();
});
