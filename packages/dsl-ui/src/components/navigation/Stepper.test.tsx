import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Stepper } from './Stepper.js';
import type { StepperStep } from './Stepper.js';

const steps: StepperStep[] = [
	{ label: 'Step One', items: <p>Content of step one</p> },
	{ label: 'Step Two', items: <p>Content of step two</p> },
	{ label: 'Step Three', items: <p>Content of step three</p> },
];

describe('Stepper', () => {
	it('renders first step content initially', () => {
		render(<Stepper steps={steps} />);
		expect(screen.getByText('Content of step one')).toBeInTheDocument();
	});

	it('does not show "Previous" button on first step', () => {
		render(<Stepper steps={steps} />);
		expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument();
	});

	it('clicking "Next" shows second step content', () => {
		render(<Stepper steps={steps} />);
		fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		expect(screen.getByText('Content of step two')).toBeInTheDocument();
	});

	it('clicking "Previous" on step 2 goes back to step 1', () => {
		render(<Stepper steps={steps} />);
		fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		expect(screen.getByText('Content of step two')).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
		expect(screen.getByText('Content of step one')).toBeInTheDocument();
	});

	it('shows "Finish" button on last step by default', () => {
		render(<Stepper steps={steps} />);
		fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		expect(screen.getByRole('button', { name: 'Finish' })).toBeInTheDocument();
	});

	it('shows custom completedLabel on last step', () => {
		render(<Stepper steps={steps} completedLabel="Complete Setup" />);
		fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		expect(screen.getByRole('button', { name: 'Complete Setup' })).toBeInTheDocument();
	});

	it('calls onComplete when Finish is clicked on last step', () => {
		const onComplete = vi.fn();
		render(<Stepper steps={steps} onComplete={onComplete} />);
		fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
		expect(onComplete).toHaveBeenCalledOnce();
	});

	it('step indicator shows correct active state', () => {
		render(<Stepper steps={steps} />);
		const activeIndicator = screen.getAllByRole('listitem')[0]?.querySelector('[aria-current="step"]');
		expect(activeIndicator).toBeInTheDocument();
	});

	it('step indicator moves active state when navigating', () => {
		render(<Stepper steps={steps} />);
		fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		const items = screen.getAllByRole('listitem');
		// Second item should now have aria-current="step"
		const activeIndicator = items[1]?.querySelector('[aria-current="step"]');
		expect(activeIndicator).toBeInTheDocument();
	});

	it('all step labels are visible in the indicator', () => {
		render(<Stepper steps={steps} />);
		expect(screen.getByText('Step One')).toBeInTheDocument();
		expect(screen.getByText('Step Two')).toBeInTheDocument();
		expect(screen.getByText('Step Three')).toBeInTheDocument();
	});
});
