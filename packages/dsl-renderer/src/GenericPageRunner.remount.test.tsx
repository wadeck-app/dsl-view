import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { ComponentRegistryEntry } from './ComponentRegistry.js';
import { createRegistry } from './ComponentRegistry.js';
import { GenericPageRunner } from './GenericPageRunner.js';

function Toggle() {
	const [on, setOn] = React.useState(false);
	return <button onClick={() => setOn(true)}>{on ? 'toggled' : 'idle'}</button>;
}

const ToggleEntry: ComponentRegistryEntry = {
	name: 'Toggle',
	category: 'atomic',
	tags: [],
	render: () => <Toggle />,
};

function NavigateTo({ to }: { to: string }) {
	const navigate = useNavigate();
	return <button onClick={() => navigate(to)}>go {to}</button>;
}

const registry = createRegistry([ToggleEntry]);
const yamlText = '$route: /workers/:workerId\n$type: Toggle\n';

function renderAt(path: string) {
	return render(
		<MemoryRouter initialEntries={[path]}>
			<NavigateTo to="/workers/002" />
			<NavigateTo to="/other/001" />
			<Routes>
				<Route
					path="/workers/:workerId"
					element={<GenericPageRunner yamlText={yamlText} registry={registry} fetcher={vi.fn().mockResolvedValue({})} />}
				/>
				<Route
					path="/other/:workerId"
					element={<GenericPageRunner yamlText={yamlText} registry={registry} fetcher={vi.fn().mockResolvedValue({})} />}
				/>
			</Routes>
		</MemoryRouter>
	);
}

describe('GenericPageRunner remount on route param change', () => {
	it('discards component state when navigating /workers/001 -> /workers/002', () => {
		renderAt('/workers/001');
		fireEvent.click(screen.getByText('idle'));
		expect(screen.getByText('toggled')).toBeInTheDocument();

		fireEvent.click(screen.getByText('go /workers/002'));

		expect(screen.getByText('idle')).toBeInTheDocument();
	});

	it('keeps component state when only the query string changes (params unchanged)', () => {
		render(
			<MemoryRouter initialEntries={['/workers/001']}>
				<NavigateTo to="/workers/001?tab=b" />
				<Routes>
					<Route
						path="/workers/:workerId"
						element={<GenericPageRunner yamlText={yamlText} registry={registry} fetcher={vi.fn().mockResolvedValue({})} />}
					/>
				</Routes>
			</MemoryRouter>
		);
		fireEvent.click(screen.getByText('idle'));

		fireEvent.click(screen.getByText('go /workers/001?tab=b'));

		expect(screen.getByText('toggled')).toBeInTheDocument();
	});
});
