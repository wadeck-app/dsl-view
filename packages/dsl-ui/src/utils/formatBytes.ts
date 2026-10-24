const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

export function formatBytes(bytes: number): string {
	// NaN / Infinity have no unit: show them as they are rather than "NaN undefined".
	if (!Number.isFinite(bytes)) {
		return String(bytes);
	}
	if (bytes < 0) {
		return `-${formatBytes(-bytes)}`;
	}
	if (bytes === 0) {
		return '0 B';
	}
	const k = 1024;
	let i = Math.min(Math.max(Math.floor(Math.log(bytes) / Math.log(k)), 0), UNITS.length - 1);
	// 1048575 B is 1023.999 KB: toFixed(1) would print "1024.0 KB". Move up to the next unit when the rounded value hits k.
	if (i > 0 && i < UNITS.length - 1 && Number((bytes / Math.pow(k, i)).toFixed(1)) >= k) {
		i += 1;
	}
	const value = bytes / Math.pow(k, i);
	return `${i === 0 ? value.toFixed(0) : value.toFixed(1)} ${UNITS[i]}`;
}
