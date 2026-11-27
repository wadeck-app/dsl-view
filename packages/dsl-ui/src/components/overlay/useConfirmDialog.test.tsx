// The host calls useConfirmDialog once: `confirm` is what it gives to the runner's ConfirmProvider, `dialog` is what it renders. An action's
// `confirm` question then opens a dsl-ui dialog instead of the browser's native one.
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useConfirmDialog } from './useConfirmDialog.js';

function Host({ onAnswer, questions }: { onAnswer: (message: string, yes: boolean) => void; questions: string[] }) {
	const { confirm, dialog } = useConfirmDialog();
	return (
		<>
			{questions.map(question => (
				<button key={question} onClick={() => void Promise.resolve(confirm(question)).then(yes => onAnswer(question, yes))}>
					{question}
				</button>
			))}
			{dialog}
		</>
	);
}

function setup(questions: string[] = ['Delete this asset?']) {
	const onAnswer = vi.fn();
	const native = vi.spyOn(window, 'confirm');
	render(<Host onAnswer={onAnswer} questions={questions} />);
	fireEvent.click(screen.getByRole('button', { name: questions[0]! }));
	return { onAnswer, native };
}

describe('useConfirmDialog', () => {
	it('shows the question in a dialog, never the native one', async () => {
		const { native } = setup();
		expect(await screen.findByRole('dialog')).toHaveTextContent('Delete this asset?');
		expect(native).not.toHaveBeenCalled();
	});

	it('answers yes on Confirm and closes', async () => {
		const { onAnswer } = setup();
		fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }));
		await waitFor(() => expect(onAnswer).toHaveBeenCalledWith('Delete this asset?', true));
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
	});

	it('answers no on Cancel', async () => {
		const { onAnswer } = setup();
		fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
		await waitFor(() => expect(onAnswer).toHaveBeenCalledWith('Delete this asset?', false));
	});

	it('answers no on Escape', async () => {
		const { onAnswer } = setup();
		fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' });
		await waitFor(() => expect(onAnswer).toHaveBeenCalledWith('Delete this asset?', false));
	});

	it('a second question while one is open answers no to the first and shows the second', async () => {
		const { onAnswer } = setup(['one', 'two']);
		await screen.findByRole('dialog');
		fireEvent.click(screen.getByRole('button', { name: 'two', hidden: true }));
		await waitFor(() => expect(onAnswer).toHaveBeenCalledWith('one', false));
		expect(await screen.findByRole('dialog')).toHaveTextContent('two');
	});
});
