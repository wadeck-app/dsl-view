import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { contentKey, plainFormData } from '@dsl-ui/utils/contentKey.js';

/** One thing the form has to tell the user: an error blocks the submit, a warning does not, an info is only shown. */
export interface FormMessage {
	severity: 'info' | 'warning' | 'error';
	text: string;
	/** The label of the field it is about, shown before the text. */
	field?: string;
}

export interface FormContextValue {
	formData: Record<string, unknown>;
	onChange: (key: string, value: unknown) => void;
	hasChanges: boolean;
	isPending: boolean;
	// The state below is read by children that adapt to it; each is optional so a child treats a form that does not give it as "unknown".
	/** Every message: the page's, the validator's and the fields'. Errors first, then warnings, then infos. */
	messages?: FormMessage[];
	errors?: number;
	warnings?: number;
	/** At least one error: the form cannot be submitted. */
	blocking?: boolean;
	/** The form can be submitted now: no error and no save running. A page that wants "and modified" adds `hasChanges`. */
	submittable?: boolean;
	/** Used by a field to tell the form about its own error; `null` clears it. */
	reportFieldMessage?: (id: string, message: FormMessage | null) => void;
}

export const FormContext = createContext<FormContextValue | null>(null);

export function useFormContext(): FormContextValue | null {
	return useContext(FormContext);
}

export interface FormProps {
	/** @slot tag:field */
	fields: React.ReactNode;
	// ButtonSave/ButtonCancel carry tag:form-specific (not tag:action-bar) - they are the
	// form-bound action buttons meant to live here (ctx['onSubmit']/ctx['isPending']-driven).
	/** @slot tag:action-bar, tag:form-specific, tag:button */
	actions: React.ReactNode;
	onSubmit: (formData: Record<string, unknown>) => Promise<void>;
	/** Initial server data - Form owns the editable copy internally. */
	initialData?: Record<string, unknown>;
	/** Messages the page wants shown (a list of { severity, text, field? }); an error blocks the submit. */
	messages?: FormMessage[];
	/** Called with the form data on every change; what it returns joins the messages. */
	validate?: (formData: Record<string, unknown>) => FormMessage[];
}

/**
 * @registryCategory composite
 * @registryTags form
 */
export function Form({ fields, actions, onSubmit, initialData: initialDataProp, messages: pageMessages, validate }: FormProps) {
	// A click handler can hand the form the clicked element or event as data: neither is form data, and either would
	// reach the request body. Identity is kept when nothing was dropped.
	const initialData = useMemo(() => plainFormData(initialDataProp), [initialDataProp]);
	const [formState, setFormState] = useState<Record<string, unknown>>(initialData ?? {});
	const [savedState, setSavedState] = useState<Record<string, unknown>>(initialData ?? {});
	const [isPending, setIsPending] = useState(false);
	const isFirstRender = useRef(true);
	const isSubmittingRef = useRef(false);

	// A page that polls hands over a NEW object with the same content on every reload; keying on the
	// content keeps the user's in-progress edits unless the server data really changed.
	const initialKey = contentKey(initialData);

	// Sync formState when server data refreshes (skip initial mount to avoid resetting in-progress edits)
	useEffect(() => {
		if (isFirstRender.current) {
			isFirstRender.current = false;
			return;
		}
		if (initialData != null) {
			setFormState(initialData);
			setSavedState(initialData);
		}
		// initialKey is the content of initialData: the effect must not re-run for a new identity alone.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [initialKey]);

	// A save succeeded and the page has not re-sent the server data since. The next re-send, even with the same
	// content, is the reload that follows the save: an "add" form fed with constant defaults is cleared by it.
	const savedAwaitingReloadRef = useRef(false);
	// The page re-sent the data while the save was still running (reloadSources inside the action).
	const reloadedDuringSaveRef = useRef(false);
	const latestInitialRef = useRef(initialData);
	const isFirstIdentity = useRef(true);

	useEffect(() => {
		latestInitialRef.current = initialData;
		if (isFirstIdentity.current) {
			isFirstIdentity.current = false;
			return;
		}
		if (initialData == null) {
			return;
		}
		if (isSubmittingRef.current) {
			reloadedDuringSaveRef.current = true;
			return;
		}
		if (savedAwaitingReloadRef.current) {
			savedAwaitingReloadRef.current = false;
			setFormState(initialData);
			setSavedState(initialData);
		}
	}, [initialData]);

	const hasChanges = contentKey(formState) !== contentKey(savedState);

	const [fieldMessages, setFieldMessages] = useState<Record<string, FormMessage>>({});
	const reportFieldMessage = useCallback((id: string, message: FormMessage | null) => {
		setFieldMessages(prev => {
			const current = prev[id];
			if (message === null) {
				if (current === undefined) {
					return prev;
				}
				const { [id]: _removed, ...rest } = prev;
				return rest;
			}
			return current !== undefined && current.severity === message.severity && current.text === message.text && current.field === message.field ? prev : { ...prev, [id]: message };
		});
	}, []);
	const messages = useMemo(() => collectMessages([...(pageMessages ?? []), ...(validate?.(formState) ?? []), ...Object.values(fieldMessages)]), [pageMessages, validate, formState, fieldMessages]);
	const errors = messages.filter(message => message.severity === 'error').length;
	const warnings = messages.filter(message => message.severity === 'warning').length;
	const blocking = errors > 0;

	const onChange = useCallback((key: string, value: unknown) => {
		setFormState(prev => ({ ...prev, [key]: value }));
	}, []);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		// A second Enter or click while the first save is running must not send the data twice.
		if (isSubmittingRef.current) {
			return;
		}
		// An error blocks the submit whatever triggered it (Enter in a field included).
		if (blocking) {
			return;
		}
		isSubmittingRef.current = true;
		reloadedDuringSaveRef.current = false;
		// A refused save must keep what was typed, even if an earlier save is still waiting for its reload.
		savedAwaitingReloadRef.current = false;
		setIsPending(true);
		try {
			await onSubmit(formState);
			const refreshed = latestInitialRef.current;
			if (reloadedDuringSaveRef.current && refreshed != null) {
				// The reload already landed: show the server data now, nothing else will re-send it.
				setFormState(refreshed);
				setSavedState(refreshed);
			} else {
				setSavedState(formState);
				savedAwaitingReloadRef.current = true;
			}
		} catch (submitError) {
			// The handler reports the failure to the user (the page notifier) and rejects so the form keeps
			// its values and stays unsaved. Swallowing it here avoids an unhandled rejection; the log keeps
			// the cause for a handler that rejected without telling the user.
			console.error('[Form] onSubmit failed; the form keeps its values and stays unsaved:', submitError);
		} finally {
			isSubmittingRef.current = false;
			setIsPending(false);
		}
	}

	return (
		<FormContext.Provider value={{ formData: formState, onChange, hasChanges, isPending, messages, errors, warnings, blocking, submittable: !blocking && !isPending, reportFieldMessage }}>
			<form onSubmit={e => { void handleSubmit(e); }} className="space-y-6">
				{fields}
				{actions && <div className="flex items-center gap-4 pt-2">{actions}</div>}
			</form>
		</FormContext.Provider>
	);
}

const SEVERITY_ORDER: Record<FormMessage['severity'], number> = { error: 0, warning: 1, info: 2 };

// Same message from two sources (a field's error also given by the page) is shown once; errors come first.
function collectMessages(all: FormMessage[]): FormMessage[] {
	const seen = new Set<string>();
	return all
		.filter(message => {
			const key = `${message.severity}|${message.field ?? ''}|${message.text}`;
			if (seen.has(key)) {
				return false;
			}
			seen.add(key);
			return true;
		})
		.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
