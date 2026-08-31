import { Check } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '../controls/_Button.js';

const navClass = 'flex items-center justify-between border-t border-border pt-4';

const stepCircleBase = 'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors';
const stepCircleCompleted = `${stepCircleBase} border-[var(--color-primary-solid)] bg-[var(--color-primary-solid)] text-white`;
const stepCircleActive = `${stepCircleBase} border-[var(--color-primary-solid)] bg-surface text-[var(--color-primary-solid)]`;
const stepCircleInactive = `${stepCircleBase} border-border bg-surface text-muted`;

const stepLabelActive = 'mt-1 text-xs font-medium text-[var(--color-primary-solid)]';
const stepLabelCompleted = 'mt-1 text-xs font-medium text-content';
const stepLabelInactive = 'mt-1 text-xs font-medium text-muted';

const connectorActive = 'mx-2 mb-5 h-0.5 flex-1 transition-colors bg-[var(--color-primary-solid)]';
const connectorInactive = 'mx-2 mb-5 h-0.5 flex-1 transition-colors bg-bg-secondary';

export interface StepperStep {
	label: string;
	description?: string;
	items: React.ReactNode;
}

export interface StepperProps {
	steps: StepperStep[];
	onComplete?: () => void;
	onCancel?: () => void;
	completedLabel?: string;
	className?: string;
}

/**
 * @registryCategory disposition
 * @registryTags stepper wizard
 */
export function Stepper({ steps, onComplete, onCancel, completedLabel = 'Finish', className }: StepperProps) {
	const [currentStep, setCurrentStep] = useState(0);
	const isFirst = currentStep === 0;
	const isLast = currentStep === steps.length - 1;

	function handleNext() {
		if (isLast) {
			onComplete?.();
		} else {
			setCurrentStep(s => s + 1);
		}
	}

	function handlePrevious() {
		if (!isFirst) {
			setCurrentStep(s => s - 1);
		}
	}

	return (
		<div className={['flex flex-col gap-6', className].filter(Boolean).join(' ')}>
			{/* Step indicator */}
			<ol className="flex items-center gap-0">
				{steps.map((step, index) => {
					const isCompleted = index < currentStep;
					const isActive = index === currentStep;
					return (
						<li key={index} className="flex flex-1 items-center">
							<div className="flex flex-col items-center">
								<div
									aria-current={isActive ? 'step' : undefined}
									className={isCompleted ? stepCircleCompleted : isActive ? stepCircleActive : stepCircleInactive}
								>
									{isCompleted ? (
										<Check className="h-3 w-3" aria-hidden="true" />
									) : (
										index + 1
									)}
								</div>
								<span
									className={isActive ? stepLabelActive : isCompleted ? stepLabelCompleted : stepLabelInactive}
								>
									{step.label}
								</span>
								{step.description && (
									<span className="text-xs text-muted">{step.description}</span>
								)}
							</div>
							{index < steps.length - 1 && (
								<div className={index < currentStep ? connectorActive : connectorInactive} />
							)}
						</li>
					);
				})}
			</ol>

			{/* Step content */}
			<div className="flex-1">{steps[currentStep]?.items}</div>

			{/* Navigation buttons */}
			<div className={navClass}>
				<div>
					{!isFirst && (
						<Button type="button" variant="secondary" size="md" onClick={handlePrevious}>
							Previous
						</Button>
					)}
				</div>
				<div className="flex gap-2">
					{onCancel && (
						<Button type="button" variant="secondary" size="md" onClick={onCancel}>
							Cancel
						</Button>
					)}
					<Button type="button" variant="primary" size="md" onClick={handleNext}>
						{isLast ? completedLabel : 'Next'}
					</Button>
				</div>
			</div>
		</div>
	);
}
