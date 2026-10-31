import React from 'react';
import { ChevronDown } from 'lucide-react';

import { useOptionalUrlParam } from '../../context/UrlParamContext.js';
import { reportAuthoringMistake } from '@dsl-ui/utils/devDiagnostics.js';
import type { FieldSelectOption } from '../form/FieldSelect.js';

// pr-8 reserves the chevron's column. A native select draws its own arrow inside the box, so the
// arrow is suppressed with appearance-none and drawn here instead, the same treatment FieldSelect
// gives it -- at the tighter padding a toolbar row needs, and sized to its content rather than w-full.
// @formatter:off
const selectClass  = 'appearance-none rounded border border-border bg-surface text-content pl-2 pr-8 py-1 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const chevronClass = 'pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted';
// @formatter:on

export interface CompactSelectProps {
	/**
	 * URL search param name backing the selected value, e.g. "status". When set, CompactSelect
	 * reads/writes it via UrlParamContext (see useOptionalUrlParam) and `value`/`onChange` are
	 * ignored, so a page can filter a $sources entry with `$urlParam.status`. Requires RouterProvider.
	 */
	urlParam?: string;
	/**
	 * Other URL search params deleted in the same URL update when the choice changes, typically
	 * ["page"] so changing a filter does not leave a stale page number behind. Requires `urlParam`.
	 */
	resetUrlParams?: string[];
	/** Ignored when `urlParam` is set. */
	value: string;
	options: FieldSelectOption[];
	/** Ignored when `urlParam` is set. */
	onChange: (value: string) => void;
	/**
	 * The control's accessible name. Required, not optional.
	 *
	 * There is no visible label by design, so this is the only name the control has -- and an unnamed
	 * control is the exact defect that left three shipped date fields announcing nothing. The type is
	 * what enforces it; a caller cannot forget.
	 *
	 * Named `ariaLabel` rather than `aria-label` because the entries generator skips `aria-*` props, so
	 * the DOM-attribute spelling would be unreachable from a DSL page.
	 */
	ariaLabel: string;
	/** The empty choice. Omitted, there is no empty option to pick by accident. */
	placeholder?: string;
	disabled?: boolean;
	/**
	 * Value shown while the `urlParam` is absent from the URL, e.g. the choice a page's sources assume when they
	 * receive no parameter. It is only displayed: the URL is not written until the user picks something. Ignored
	 * without `urlParam`. Should be one of the option values; a text that is not is still shown (as `Unknown: <value>`)
	 * and reported once in development, any other type is ignored and reported. A present but empty parameter
	 * (`?name=`) is a choice (the placeholder) and does not fall back to it.
	 */
	defaultValue?: string;
}

/**
 * A select for a toolbar: compact, no visible label, generic options.
 *
 * Neither existing select fits that shape. PageSizeSelect is compact and label-less but renders its
 * options as "N / page" from a number[], locked to pagination. FieldSelect takes generic options but
 * goes through FieldWrapper, so it comes with a visible label and a full-width control. Consumers
 * needing a labelled-by-context dropdown in a row of controls therefore fell back to a raw `<select>`,
 * which is how the orchestrator's log run selector ended up unstyled and unnamed.
 *
 * @registryCategory atomic
 * @registryTags select compact toolbar
 * @registryBind formData onChange
 */
export function CompactSelect({ urlParam, resetUrlParams, value: valueProp, options, onChange: onChangeProp, ariaLabel, placeholder, disabled, defaultValue: defaultProp }: CompactSelectProps) {
	const [urlValue, setUrlValue] = useOptionalUrlParam(urlParam, { resetUrlParams });
	// `null` is "no value" for every prop (a YAML `key:` with nothing); only a text can be shown as a choice.
	const defaultValue = typeof defaultProp === 'string' ? defaultProp : undefined;
	// The empty text is a valid default only when a placeholder gives it an option.
	const defaultListed = defaultValue !== undefined && (options.some(opt => opt.value === defaultValue) || (defaultValue === '' && placeholder !== undefined));
	if (defaultProp != null && !defaultListed) {
		reportAuthoringMistake(`[CompactSelect] defaultValue ${typeof defaultProp === 'string' ? `"${defaultProp}"` : String(defaultProp)} is not one of the option values (${options.map(opt => opt.value).join(', ')})${defaultValue === undefined ? ' and is ignored: it must be a text' : ''}.`);
	}
	const value = urlParam != null ? urlValue ?? defaultValue ?? '' : valueProp;
	// A value no option carries (hand-edited link, changed options) would otherwise show the first option while the
	// page still uses that value. The empty text is "nothing chosen" and keeps its existing display.
	const unlisted = typeof value === 'string' && value !== '' && !options.some(opt => opt.value === value);
	const onChange = urlParam != null ? setUrlValue : onChangeProp;
	return (
		<span className="relative inline-flex">
			{/* violations-suppress: react/no-raw-input CompactSelect IS the atomic wrapper for this select interaction, as PageSizeSelect is for pagination */}
			<select
				value={value}
				onChange={e => onChange(e.target.value)}
				className={selectClass}
				aria-label={ariaLabel}
				disabled={disabled}
			>
				{placeholder !== undefined && <option value="">{placeholder}</option>}
				{unlisted && (
					<option value={value} disabled>
						{`Unknown: ${value}`}
					</option>
				)}
				{options.map(opt => (
					<option key={opt.value} value={opt.value}>
						{opt.label}
					</option>
				))}
			</select>
			<ChevronDown className={chevronClass} aria-hidden="true" />
		</span>
	);
}
