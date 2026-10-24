import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { contentKey, plainFormData } from '@dsl-ui/utils/contentKey.js';

export interface FormContextValue {
	formData: Record<string, unknown>;
	onChange: (key: string, value: unknown) => void;
	hasChanges: boolean;
	isPending: boolean;
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
	/** @slot tag:action-bar, tag:form-specific */
	actions: React.ReactNode;
	onSubmit: (formData: Record<string, unknown>) => Promise<void>;
	/** Initial server data - Form owns the editable copy internally. */
	initialData?: Record<string, unknown>;
}

/**
 * @registryCategory composite
 * @registryTags form
 */
export function Form({ fields, actions, onSubmit, initialData: initialDataProp }: FormProps) {
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

	const onChange = useCallback((key: string, value: unknown) => {
		setFormState(prev => ({ ...prev, [key]: value }));
	}, []);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		// A second Enter or click while the first save is running must not send the data twice.
		if (isSubmittingRef.current) {
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
		<FormContext.Provider value={{ formData: formState, onChange, hasChanges, isPending }}>
			<form onSubmit={e => { void handleSubmit(e); }} className="space-y-6">
				{fields}
				{actions && <div className="flex items-center gap-4 pt-2">{actions}</div>}
			</form>
		</FormContext.Provider>
	);
}
