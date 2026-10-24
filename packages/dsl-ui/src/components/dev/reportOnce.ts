const reported = new Set<string>();

// Logs `message` the first time only: a render loop or a list of identical nodes must not flood the console.
// The memory lives in this module, so it spans every caller (AbTest nodes, useRegisterAbTests) for the page's lifetime.
export function reportOnce(message: string, log: (message: string) => void = console.warn): void {
	if (!reported.has(message)) {
		reported.add(message);
		log(message);
	}
}
