import React from 'react';

import { ButtonCancel } from '../form/ButtonCancel.js';
import { ButtonSave } from '../form/ButtonSave.js';
import { Form } from '../form/Form.js';
import { Dialog } from './Dialog.js';

export interface DialogFormProps {
	title: string;
	/** Truthy = dialog open; falsy = dialog closed. */
	visible: unknown;
	/** Pre-populate the form. An object with an `id` key = edit mode; otherwise = create mode. */
	initialData?: Record<string, unknown> | null;
	onClose?: () => void;
	onSubmit: (data: Record<string, unknown>) => Promise<void>;
	/** Optional separate handler for edit mode (when initialData has an id). When omitted, onSubmit is used for both create and edit. */
	onSubmitEdit?: (data: Record<string, unknown>) => Promise<void>;
	/** @slot tag:field */
	fields: React.ReactNode;
	size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * @registryCategory composite
 * @registryTags dialog form
 */
export function DialogForm({ title, visible, initialData, onClose = () => undefined, onSubmit, onSubmitEdit, fields, size = 'md' }: DialogFormProps) {
	const isOpen = Boolean(visible);
	const editData =
		initialData != null && typeof initialData === 'object' && 'id' in initialData
			? (initialData as Record<string, unknown>)
			: undefined;

	function handleOpenChange(next: boolean) {
		if (!next) onClose();
	}

	async function handleSubmit(data: Record<string, unknown>) {
		if (editData) {
			const submitEdit = onSubmitEdit ?? onSubmit;
			await submitEdit({ ...data, id: String(editData['id']) });
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
				initialData={editData}
				onSubmit={handleSubmit}
			/>
		</Dialog>
	);
}
