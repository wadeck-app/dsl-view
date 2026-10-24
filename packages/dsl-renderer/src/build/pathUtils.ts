// Pure string helpers shared by the Vite plugins of this folder (no fs, so they are cheap to test on any OS).

const toPosix = (p: string): string => p.replace(/\\/g, '/');

/**
 * True when `file` is `dir` or lives under it. Vite hands `handleHotUpdate` a posix-style `file` ("C:/app/src/x.yaml")
 * while `path.join`/`path.resolve` return backslashes on Windows ("C:\app\src"), so a plain `startsWith` never matched
 * there and hot updates silently stopped regenerating the files. Both sides are normalised, the match is made on a
 * path-segment boundary (`/pages` must not match `/pages-old/x.yaml`), and the drive letter case is ignored on Windows.
 */
export function isPathInside(dir: string, file: string, caseInsensitive: boolean = process.platform === 'win32'): boolean {
	const normalise = (p: string) => (caseInsensitive ? toPosix(p).toLowerCase() : toPosix(p));
	const base = normalise(dir).replace(/\/+$/, '');
	const target = normalise(file);
	return target === base || target.startsWith(base + '/');
}
