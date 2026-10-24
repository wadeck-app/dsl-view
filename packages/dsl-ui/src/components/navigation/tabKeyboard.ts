/**
 * Index of the tab a navigation key moves to, or null when the key is not a tab navigation key.
 * Arrow keys wrap around; Home and End jump to the first and last tab. Shared by Tabs and PageTabs.
 */
export function nextTabIndex(key: string, index: number, count: number): number | null {
	if (count <= 0) {
		return null;
	}
	switch (key) {
		case 'ArrowRight':
			return (index + 1) % count;
		case 'ArrowLeft':
			return (index - 1 + count) % count;
		case 'Home':
			return 0;
		case 'End':
			return count - 1;
		default:
			return null;
	}
}
