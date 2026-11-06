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
	// Id of the test whose chosen variant declares this one (an AbTest inside a variant). The dock shows it ABOVE its parent.
	parentId?: string;
}

// Whole-dock state: 'open' (default) or 'collapsed' (a small pill; every choice stays applied).
export const COLLAPSED_DOCK_KEY = 'ab.collapsed';
