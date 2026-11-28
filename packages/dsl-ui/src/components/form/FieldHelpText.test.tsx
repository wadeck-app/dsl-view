// A field can carry small muted help text under its control (a format, a hint). It describes the control; `description` stays above it.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FieldAsyncSelect } from './FieldAsyncSelect.js';
import { FieldDate } from './FieldDate.js';
import { FieldNumber } from './FieldNumber.js';
import { FieldSecret } from './FieldSecret.js';
import { FieldSelect } from './FieldSelect.js';
import { FieldTags } from './FieldTags.js';
import { FieldText } from './FieldText.js';
import { FieldTextarea } from './FieldTextarea.js';
import { FieldWrapper } from './FieldWrapper.js';

describe('FieldWrapper helpText', () => {
	it('is shown under the control, muted, and describes it', () => {
		render(
			<FieldWrapper label="Name" helpText="Hint: h9">
				<input />
			</FieldWrapper>
		);
		const help = screen.getByText('Hint: h9');
		expect(help).toHaveClass('mt-1', 'text-xs', 'text-muted');
		const input = screen.getByLabelText('Name');
		expect(input.compareDocumentPosition(help) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(input.getAttribute('aria-describedby')).toBe(help.id);
	});

	it('lists the help text and the error in aria-describedby', () => {
		render(
			<FieldWrapper label="Name" helpText="Hint" error="Too short">
				<input />
			</FieldWrapper>
		);
		const ids = (screen.getByLabelText('Name').getAttribute('aria-describedby') ?? '').split(' ');
		expect(ids).toEqual([screen.getByText('Hint').id, screen.getByText('Too short').id]);
	});

	it('writes nothing without it', () => {
		render(
			<FieldWrapper label="Name">
				<input />
			</FieldWrapper>
		);
		expect(screen.getByLabelText('Name')).not.toHaveAttribute('aria-describedby');
	});
});

describe('every field passes helpText through', () => {
	const noop = vi.fn();
	const cases: Array<[string, React.ReactElement]> = [
		['FieldText', <FieldText label="L" value="" onChange={noop} helpText="help" />],
		['FieldTextarea', <FieldTextarea label="L" value="" onChange={noop} helpText="help" />],
		['FieldNumber', <FieldNumber label="L" value={1} onChange={noop} helpText="help" />],
		['FieldSelect', <FieldSelect label="L" value="" onChange={noop} options={[{ value: 'a', label: 'a' }]} helpText="help" />],
		['FieldSecret', <FieldSecret label="L" helpText="help" />],
		['FieldDate', <FieldDate label="L" value={null} onChange={noop} helpText="help" />],
		['FieldTags', <FieldTags label="L" value={[]} onChange={noop} helpText="help" />],
		['FieldAsyncSelect', <FieldAsyncSelect label="L" value="" onChange={noop} loadOptions={async () => []} helpText="help" />],
	];
	it.each(cases)('%s', (_name, element) => {
		render(element);
		expect(screen.getByText('help')).toBeInTheDocument();
	});
});
