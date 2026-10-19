export const HIDDEN_TESTS_KEY = 'ab.hidden';

export interface AbOption {
	id: string;
	label: string;
	// Tooltip: what this option changes compared with the reference one.
	title: string;
}

export interface AbTest {
	id: string;
	// Name of the test, shown on the left of its row.
	label: string;
	// Current choice, shown on the reminder chip when the row is hidden.
	summary: string;
	options: readonly AbOption[];
	value: string;
	onSelect: (id: string) => void;
}
