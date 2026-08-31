import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

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
export function Form({ fields, actions, onSubmit, initialData }: FormProps) {
	const [formState, setFormState] = useState<Record<string, unknown>>(initialData ?? {});
	const [savedState, setSavedState] = useState<Record<string, unknown>>(initialData ?? {});
	const [isPending, setIsPending] = useState(false);
	const isFirstRender = useRef(true);

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
	}, [initialData]);

	const hasChanges = JSON.stringify(formState) !== JSON.stringify(savedState);

	const onChange = useCallback((key: string, value: unknown) => {
		setFormState(prev => ({ ...prev, [key]: value }));
	}, []);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setIsPending(true);
		try {
			await onSubmit(formState);
			setSavedState(formState);
		} finally {
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
