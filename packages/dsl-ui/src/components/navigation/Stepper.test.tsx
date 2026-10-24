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

describe('Stepper navigation', () => {
	function next() {
		fireEvent.click(screen.getByRole('button', { name: 'Next' }));
	}

	it('only the current step content is mounted', () => {
		render(<Stepper steps={steps} />);
		expect(screen.queryByText('Content of step two')).not.toBeInTheDocument();
		next();
		expect(screen.queryByText('Content of step one')).not.toBeInTheDocument();
		expect(screen.getByText('Content of step two')).toBeInTheDocument();
	});

	it('the middle step still says Next, only the last one says the completed label', () => {
		render(<Stepper steps={steps} completedLabel="Done" />);
		next();
		expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();
	});

	it('Previous walks back one step at a time from the last step', () => {
		render(<Stepper steps={steps} />);
		next();
		next();
		fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
		expect(screen.getByText('Content of step two')).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
		expect(screen.getByText('Content of step one')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument();
	});

	it('onComplete is not called before the last step and once per click on it', () => {
		const onComplete = vi.fn();
		render(<Stepper steps={steps} onComplete={onComplete} />);
		next();
		next();
		expect(onComplete).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
		expect(onComplete).toHaveBeenCalledTimes(1);
		// The stepper stays on the last step: the host decides what completion means.
		expect(screen.getByText('Content of step three')).toBeInTheDocument();
	});

	it('Finish without an onComplete handler does nothing and does not throw', () => {
		render(<Stepper steps={steps} />);
		next();
		next();
		expect(() => fireEvent.click(screen.getByRole('button', { name: 'Finish' }))).not.toThrow();
		expect(screen.getByText('Content of step three')).toBeInTheDocument();
	});

	it('Cancel exists only with an onCancel handler and calls it from any step', () => {
		const onCancel = vi.fn();
		const { rerender } = render(<Stepper steps={steps} />);
		expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
		rerender(<Stepper steps={steps} onCancel={onCancel} />);
		next();
		fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(screen.getByText('Content of step two')).toBeInTheDocument();
	});

	it('a single step is also the last: Finish at once, no Previous', () => {
		const onComplete = vi.fn();
		render(<Stepper steps={[{ label: 'Only', items: <p>Alone</p> }]} onComplete={onComplete} />);
		expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
		expect(onComplete).toHaveBeenCalledTimes(1);
	});

	it('its buttons never submit a surrounding form', () => {
		const onSubmit = vi.fn(e => e.preventDefault());
		render(
			<form onSubmit={onSubmit}>
				<Stepper steps={steps} onCancel={vi.fn()} />
			</form>,
		);
		next();
		fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
		fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
		expect(onSubmit).not.toHaveBeenCalled();
	});
});

describe('Stepper indicator semantics', () => {
	it('each step is announced by its state: completed, current, upcoming', () => {
		render(<Stepper steps={steps} />);
		fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		const [first, second, third] = screen.getAllByRole('listitem');
		expect(first).toHaveTextContent('Completed');
		expect(first!.querySelector('[aria-current]')).toBeNull();
		expect(second).toHaveTextContent('Completed');
		expect(third!.querySelector('[aria-current="step"]')).not.toBeNull();
		expect(third).not.toHaveTextContent('Completed');
	});

	it('an upcoming step shows its number and is neither current nor completed', () => {
		render(<Stepper steps={steps} />);
		const upcoming = screen.getAllByRole('listitem')[2]!;
		expect(upcoming).toHaveTextContent('3');
		expect(upcoming.querySelector('[aria-current]')).toBeNull();
		expect(upcoming).not.toHaveTextContent('Completed');
	});

	it('shows the description of a step under its label, only when given', () => {
		render(
			<Stepper
				steps={[
					{ label: 'Account', description: 'Who you are', items: <p>a</p> },
					{ label: 'Plan', items: <p>b</p> },
				]}
			/>,
		);
		const [account, plan] = screen.getAllByRole('listitem');
		expect(account).toHaveTextContent('Who you are');
		expect(plan).not.toHaveTextContent('Who you are');
	});

	it('adds a consumer className to the root', () => {
		const { container } = render(<Stepper steps={steps} className="max-w-xl" />);
		expect(container.firstElementChild).toHaveClass('max-w-xl');
		expect(container.firstElementChild).toHaveClass('flex');
	});
});

describe('Stepper when the steps change', () => {
	it('losing steps while on the last one lands on the new last step instead of a blank panel', () => {
		const { rerender } = render(<Stepper steps={steps} />);
		fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		expect(screen.getByText('Content of step three')).toBeInTheDocument();

		rerender(<Stepper steps={steps.slice(0, 2)} />);

		expect(screen.getByText('Content of step two')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Finish' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
	});

	it('gaining steps keeps the current one and turns Finish back into Next', () => {
		const { rerender } = render(<Stepper steps={steps.slice(0, 2)} />);
		fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		expect(screen.getByRole('button', { name: 'Finish' })).toBeInTheDocument();

		rerender(<Stepper steps={steps} />);

		expect(screen.getByText('Content of step two')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
	});

	it('no steps at all renders nothing and says why, instead of a Next button that goes nowhere', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { container } = render(<Stepper steps={[]} />);
		expect(container).toBeEmptyDOMElement();
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('[Stepper]'));
	});
});
