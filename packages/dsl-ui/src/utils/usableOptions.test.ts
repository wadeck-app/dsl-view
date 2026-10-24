import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usableOptions } from './usableOptions.js';

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
	warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('usableOptions', () => {
	it('returns the same entries, in order, when all have a text label (and says nothing)', () => {
		const options = [{ value: 'a', label: 'A' }, { value: 'b', label: '' }];
		expect(usableOptions(options, 'FieldAutocomplete.options')).toStrictEqual(options);
		expect(warn).not.toHaveBeenCalled();
	});

	it('leaves out entries that are not maps or have no text label, keeping the order of the others, and reports the count once', () => {
		const good1 = { value: 'x', label: 'X' };
		const good2 = { value: 'y', label: 'Y' };
		const mixed = [{}, good1, null, 'text', { value: 'z', label: 5 }, good2] as unknown as Array<{ label: string }>;
		expect(usableOptions(mixed, 'FieldAutocomplete.options 1')).toStrictEqual([good1, good2]);
		expect(usableOptions(mixed, 'FieldAutocomplete.options 1')).toStrictEqual([good1, good2]);
		expect(warn).toHaveBeenCalledExactlyOnceWith('[FieldAutocomplete.options 1] 4 of 6 option(s) have no text label and are left out: write each option as { value, label }.');
	});

	it('gives an empty list for an empty list', () => {
		expect(usableOptions([], 'X.options')).toStrictEqual([]);
		expect(warn).not.toHaveBeenCalled();
	});
});
