import React from 'react';

import { ButtonCancel } from '../form/ButtonCancel.js';
import { ButtonSave } from '../form/ButtonSave.js';
import { Form } from '../form/Form.js';
import { Dialog } from './Dialog.js';

export interface DialogFormProps {
	title: string;
	/** Truthy = dialog open; falsy = dialog closed. */
	visible: unknown;
	/**
	 * Pre-populate the form. An object with a non-null `id` = edit mode; any other object (or none) = create mode, which
	 * still pre-populates the fields (a template for a new item) and submits through `onSubmit`.
	 */
	initialData?: Record<string, unknown> | null;
	onClose?: () => void;
	onSubmit: (data: Record<string, unknown>) => Promise<void>;
	/** Optional separate handler for edit mode (when initialData has an id). When omitted, onSubmit is used for both create and edit. */
	onSubmitEdit?: (data: Record<string, unknown>) => Promise<void>;
	/** @slot tag:field */
	fields: React.ReactNode;
	size?: 'sm' | 'md' | 'lg' | 'xl';
}

function withoutOpenMarker(data: Record<string, unknown>): Record<string, unknown> {
	if (!('_ts' in data)) {
		return data;
	}
	const { _ts: _marker, ...rest } = data;
	return rest;
}

/**
 * @registryCategory composite
 * @registryTags dialog form
 */
export function DialogForm({ title, visible, initialData, onClose = () => undefined, onSubmit, onSubmitEdit, fields, size = 'md' }: DialogFormProps) {
	const isOpen = Boolean(visible);
	// A `$actions` entry with a `resultKey` and no `url` (openCreate) stores `{ _ts }` as its "dialog is open" trigger: that
	// marker is not form data and must not be prefilled or submitted.
	const prefill = initialData != null && typeof initialData === 'object' ? withoutOpenMarker(initialData) : undefined;
	// Edit mode needs a real id: `{ id: null }` (a "new item" template) is a create, not an edit of the item "null".
	const editId = prefill?.['id'];
	const isEdit = editId !== undefined && editId !== null;

	function handleOpenChange(next: boolean) {
		if (!next) onClose();
	}

	async function handleSubmit(data: Record<string, unknown>) {
		if (isEdit) {
			const submitEdit = onSubmitEdit ?? onSubmit;
			await submitEdit({ ...data, id: String(editId) });
		} else {
			await onSubmit(data);
		}
		onClose();
	}

	return (
		<Dialog title={title} open={isOpen} onOpenChange={handleOpenChange} size={size}>
			<Form
				fields={fields}
				actions={
					<>
						<ButtonSave />
						<ButtonCancel onCancel={() => handleOpenChange(false)} />
					</>
				}
				initialData={prefill}
				onSubmit={handleSubmit}
			/>
		</Dialog>
	);
}
