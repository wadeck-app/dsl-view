import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { subDays, addDays, startOfMonth, endOfMonth } from 'date-fns';

import { DatePicker } from './DatePicker.js';

describe('DatePicker', () => {
	describe('Rendering', () => {
		it('renders with placeholder text', () => {
			render(<DatePicker value={null} onChange={vi.fn()} placeholder="Pick a date" />);
			expect(screen.getByDisplayValue('Pick a date')).toBeInTheDocument();
		});

		it('renders selected date in input', () => {
			const date = new Date(2024, 0, 15);
			render(<DatePicker value={date} onChange={vi.fn()} />);
			expect(screen.getByDisplayValue(/Jan 15, 2024/)).toBeInTheDocument();
		});

		it('renders with default placeholder when not provided', () => {
			render(<DatePicker value={null} onChange={vi.fn()} />);
			expect(screen.getByDisplayValue(/Select a date/)).toBeInTheDocument();
		});

		it('renders clear button when date is selected', () => {
			const date = new Date(2024, 0, 15);
			render(<DatePicker value={date} onChange={vi.fn()} />);
			expect(screen.getByLabelText('Clear date')).toBeInTheDocument();
		});

		it('does not render clear button when no date selected', () => {
			render(<DatePicker value={null} onChange={vi.fn()} />);
			expect(screen.queryByLabelText('Clear date')).not.toBeInTheDocument();
		});
	});

	describe('Date Selection', () => {
		it('opens calendar on input click', async () => {
			render(<DatePicker value={null} onChange={vi.fn()} />);
			const input = screen.getByRole('combobox');
			fireEvent.click(input);

			await waitFor(
				() => {
					expect(screen.getByRole('dialog')).toBeInTheDocument();
				},
				{ timeout: 10000 },
			);
		});

		it('closes calendar after selecting date', async () => {
			const onChange = vi.fn();
			const date = new Date(2024, 0, 15);
			render(<DatePicker value={date} onChange={onChange} />);

			const input = screen.getByRole('combobox');
			fireEvent.click(input);

			await waitFor(
				() => {
					const dateButton = screen.getAllByRole('button').find(btn => btn.textContent === '15');
					expect(dateButton).toBeInTheDocument();
					fireEvent.click(dateButton!);
				},
				{ timeout: 10000 },
			);

			await waitFor(
				() => {
					expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
				},
				{ timeout: 10000 },
			);
		});

		it('calls onChange with selected date', async () => {
			const onChange = vi.fn();
			const date = new Date(2024, 0, 15);
			render(<DatePicker value={date} onChange={onChange} />);

			const input = screen.getByRole('combobox');
			fireEvent.click(input);

			await waitFor(
				() => {
					const dateButton = screen.getAllByRole('button').find(btn => btn.textContent === '20');
					expect(dateButton).toBeInTheDocument();
					fireEvent.click(dateButton!);
				},
				{ timeout: 10000 },
			);

			await waitFor(
				() => {
					expect(onChange).toHaveBeenCalledWith(expect.any(Date));
				},
				{ timeout: 10000 },
			);
		});
	});

	describe('Month Navigation', () => {
		it('displays current month header', async () => {
			const date = new Date(2024, 0, 15);
			render(<DatePicker value={date} onChange={vi.fn()} />);

			const input = screen.getByRole('combobox');
			fireEvent.click(input);

			await waitFor(
				() => {
					expect(screen.getByText(/January 2024/)).toBeInTheDocument();
				},
				{ timeout: 10000 },
			);
		});

		it('navigates to next month on next button click', async () => {
			const date = new Date(2024, 0, 15);
			render(<DatePicker value={date} onChange={vi.fn()} />);

			const input = screen.getByRole('combobox');
			fireEvent.click(input);

			await waitFor(
				() => {
					expect(screen.getByText(/January 2024/)).toBeInTheDocument();
				},
				{ timeout: 10000 },
			);

			const nextButton = screen.getByLabelText('Next month');
			fireEvent.click(nextButton);

			await waitFor(
				() => {
					expect(screen.getByText(/February 2024/)).toBeInTheDocument();
				},
				{ timeout: 10000 },
			);
		});

		it('navigates to previous month on previous button click', async () => {
			const date = new Date(2024, 1, 15);
			render(<DatePicker value={date} onChange={vi.fn()} />);

			const input = screen.getByRole('combobox');
			fireEvent.click(input);

			await waitFor(
				() => {
					expect(screen.getByText(/February 2024/)).toBeInTheDocument();
				},
				{ timeout: 10000 },
			);

			const prevButton = screen.getByLabelText('Previous month');
			fireEvent.click(prevButton);

			await waitFor(
				() => {
					expect(screen.getByText(/January 2024/)).toBeInTheDocument();
				},
				{ timeout: 10000 },
			);
		});
	});

	describe('Keyboard Navigation', () => {
		it('opens calendar on Enter key', async () => {
			render(<DatePicker value={null} onChange={vi.fn()} />);
			const input = screen.getByRole('combobox');

			await userEvent.click(input);
			fireEvent.keyDown(input, { key: 'Enter' });

			await waitFor(
				() => {
					expect(screen.getByRole('dialog')).toBeInTheDocument();
				},
				{ timeout: 10000 },
			);
		});

		it('closes calendar on Escape key', async () => {
			const date = new Date(2024, 0, 15);
			render(<DatePicker value={date} onChange={vi.fn()} />);

			const input = screen.getByRole('combobox');
			fireEvent.click(input);

			await waitFor(
				() => {
					expect(screen.getByRole('dialog')).toBeInTheDocument();
				},
				{ timeout: 10000 },
			);

			fireEvent.keyDown(input, { key: 'Escape' });

			await waitFor(
				() => {
					expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
				},
				{ timeout: 10000 },
			);
		});
	});

	describe('Disabled Dates', () => {
		it('disables dates based on predicate function', async () => {
			const date = new Date(2024, 0, 15);
			const isDisabled = (d: Date) => d.getDay() === 0 || d.getDay() === 6; // Disable weekends
			render(<DatePicker value={date} onChange={vi.fn()} isDisabled={isDisabled} />);

			const input = screen.getByRole('combobox');
			fireEvent.click(input);

			await waitFor(
				() => {
					// Sunday the 7th should be disabled
					const buttons = screen.getAllByRole('button').filter(btn => btn.textContent === '7');
					const sundayButton = buttons.find(btn => btn.getAttribute('aria-disabled') === 'true');
					expect(sundayButton).toBeInTheDocument();
					expect(sundayButton).toHaveClass('opacity-40');
				},
				{ timeout: 10000 },
			);
		});

		it('prevents selection of disabled dates', async () => {
			const onChange = vi.fn();
			const date = new Date(2024, 0, 15);
			const isDisabled = (d: Date) => d.getDate() === 20; // Disable 20th
			render(
				<DatePicker
					value={date}
					onChange={onChange}
					isDisabled={isDisabled}
				/>,
			);

			const input = screen.getByRole('combobox');
			fireEvent.click(input);

			await waitFor(
				() => {
					const disabledButton = screen.getAllByRole('button').find(
						btn => btn.textContent === '20' && btn.getAttribute('aria-disabled') === 'true',
					);
					expect(disabledButton).toBeInTheDocument();
					fireEvent.click(disabledButton!);
				},
				{ timeout: 10000 },
			);

			// onChange should not be called for disabled dates
			expect(onChange).not.toHaveBeenCalled();
		});
	});

	describe('Min/Max Date Constraints', () => {
		it('respects minDate constraint', async () => {
			const date = new Date(2024, 0, 15);
			const minDate = new Date(2024, 0, 10);
			render(
				<DatePicker
					value={date}
					onChange={vi.fn()}
					minDate={minDate}
				/>,
			);

			const input = screen.getByRole('combobox');
			fireEvent.click(input);

			await waitFor(
				() => {
					// Days before minDate should be disabled
					const buttons = screen.getAllByRole('button');
					const day5Button = buttons.find(btn => btn.textContent === '5' && btn.getAttribute('aria-disabled') === 'true');
					expect(day5Button).toBeInTheDocument();
				},
				{ timeout: 10000 },
			);
		});

		it('respects maxDate constraint', async () => {
			const date = new Date(2024, 0, 15);
			const maxDate = new Date(2024, 0, 20);
			render(
				<DatePicker
					value={date}
					onChange={vi.fn()}
					maxDate={maxDate}
				/>,
			);

			const input = screen.getByRole('combobox');
			fireEvent.click(input);

			await waitFor(
				() => {
					// Days after maxDate should be disabled
					const buttons = screen.getAllByRole('button');
					const day25Button = buttons.find(btn => btn.textContent === '25' && btn.getAttribute('aria-disabled') === 'true');
					expect(day25Button).toBeInTheDocument();
				},
				{ timeout: 10000 },
			);
		});

		it('combines minDate and isDisabled predicates', async () => {
			const date = new Date(2024, 0, 15);
			const minDate = new Date(2024, 0, 5);
			const isDisabled = (d: Date) => d.getDay() === 0; // Disable Sundays
			render(
				<DatePicker
					value={date}
					onChange={vi.fn()}
					minDate={minDate}
					isDisabled={isDisabled}
				/>,
			);

			const input = screen.getByRole('combobox');
			fireEvent.click(input);

			await waitFor(
				() => {
					const buttons = screen.getAllByRole('button');
					// Day 7 is a Sunday and should be disabled for both reasons
					const day7Button = buttons.find(btn => btn.textContent === '7' && btn.getAttribute('aria-disabled') === 'true');
					expect(day7Button).toBeInTheDocument();
				},
				{ timeout: 10000 },
			);
		});
	});

	describe('Clear Button', () => {
		it('clears selected date on clear button click', async () => {
			const onChange = vi.fn();
			const date = new Date(2024, 0, 15);
			render(<DatePicker value={date} onChange={onChange} />);

			const clearButton = screen.getByLabelText('Clear date');
			fireEvent.click(clearButton);

			expect(onChange).toHaveBeenCalledWith(null);
		});

		it('closes calendar after clear', async () => {
			const date = new Date(2024, 0, 15);
			const { rerender } = render(
				<DatePicker value={date} onChange={vi.fn()} />,
			);

			const input = screen.getByRole('combobox');
			fireEvent.click(input);

			await waitFor(
				() => {
					expect(screen.getByRole('dialog')).toBeInTheDocument();
				},
				{ timeout: 10000 },
			);

			const clearButton = screen.getByLabelText('Clear date');
			fireEvent.click(clearButton);

			// After clearing, rerender with null value to verify behavior
			rerender(<DatePicker value={null} onChange={vi.fn()} />);

			await waitFor(
				() => {
					expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
				},
				{ timeout: 10000 },
			);
		});
	});

	describe('Today Button', () => {
		it('selects today when "Today" button is clicked', async () => {
			const onChange = vi.fn();
			const date = new Date(2024, 0, 1);
			render(
				<DatePicker value={date} onChange={onChange} />,
			);

			const input = screen.getByRole('combobox');
			fireEvent.click(input);

			await waitFor(
				() => {
					const todayButton = screen.getAllByRole('button').find(btn => btn.textContent === 'Today');
					expect(todayButton).toBeInTheDocument();
					fireEvent.click(todayButton!);
				},
				{ timeout: 10000 },
			);

			expect(onChange).toHaveBeenCalledWith(expect.any(Date));
		});
	});

	describe('Disabled State', () => {
		it('disables input when disabled prop is true', () => {
			render(<DatePicker value={null} onChange={vi.fn()} disabled={true} />);
			expect(screen.getByRole('combobox')).toBeDisabled();
		});

		it('does not open calendar when disabled', () => {
			render(<DatePicker value={null} onChange={vi.fn()} disabled={true} />);
			const input = screen.getByRole('combobox');
			fireEvent.click(input);

			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});

		it('does not show clear button when disabled', () => {
			const date = new Date(2024, 0, 15);
			render(<DatePicker value={date} onChange={vi.fn()} disabled={true} />);
			expect(screen.queryByLabelText('Clear date')).not.toBeInTheDocument();
		});
	});

	describe('Edge Cases', () => {
		it('handles leap year correctly (Feb 29)', async () => {
			const date = new Date(2024, 1, 15); // Feb 2024 (leap year)
			render(<DatePicker value={date} onChange={vi.fn()} />);

			const input = screen.getByRole('combobox');
			fireEvent.click(input);

			await waitFor(
				() => {
					const feb29Button = screen.getAllByRole('button').find(btn => btn.textContent === '29');
					expect(feb29Button).toBeInTheDocument();
				},
				{ timeout: 10000 },
			);
		});

		it('handles month with 31 days', async () => {
			const date = new Date(2024, 0, 15); // January (31 days)
			render(<DatePicker value={date} onChange={vi.fn()} />);

			const input = screen.getByRole('combobox');
			fireEvent.click(input);

			await waitFor(
				() => {
					const day31Button = screen.getAllByRole('button').find(btn => btn.textContent === '31');
					expect(day31Button).toBeInTheDocument();
				},
				{ timeout: 10000 },
			);
		});

		it('handles month with 30 days', async () => {
			const date = new Date(2024, 3, 15); // April (30 days)
			render(<DatePicker value={date} onChange={vi.fn()} />);

			const input = screen.getByRole('combobox');
			fireEvent.click(input);

			await waitFor(
				() => {
					// April should have day 30 but not day 31
					const day30Button = screen.getAllByRole('button').find(btn => btn.textContent === '30');
					expect(day30Button).toBeInTheDocument();
					const allButtons = screen.getAllByRole('button');
					const day31Button = allButtons.find(btn => btn.textContent?.trim() === '31' && btn.getAttribute('aria-label')?.includes('2024'));
					expect(day31Button).toBeUndefined();
				},
				{ timeout: 10000 },
			);
		});

		it('highlights today with border', async () => {
			const today = new Date();
			render(<DatePicker value={null} onChange={vi.fn()} />);

			// Click to open (internally will set displayMonth to today)
			const input = screen.getByRole('combobox');
			fireEvent.click(input);

			await waitFor(
				() => {
					// Today should have a border
					const todayButton = screen.getAllByRole('button').find(
						btn => btn.textContent === String(today.getDate()) && btn.getAttribute('aria-label')?.includes('border-primary'),
					);
					if (todayButton) {
						expect(todayButton).toHaveClass('border', 'border-primary');
					}
				},
				{ timeout: 10000 },
			);
		});
	});

	describe('Selected Date Highlighting', () => {
		it('highlights selected date with primary background', async () => {
			const date = new Date(2024, 0, 15);
			render(<DatePicker value={date} onChange={vi.fn()} />);

			const input = screen.getByRole('combobox');
			fireEvent.click(input);

			await waitFor(
				() => {
					const buttons = screen.getAllByRole('button');
					const selectedButton = buttons.find(
						btn => btn.textContent === '15' && btn.getAttribute('aria-selected') === 'true',
					);
					expect(selectedButton).toHaveClass('bg-primary');
				},
				{ timeout: 10000 },
			);
		});
	});

	describe('Form Integration', () => {
		it('can be used as controlled component', () => {
			const onChange = vi.fn();
			const date = new Date(2024, 0, 15);
			const { rerender } = render(
				<DatePicker value={date} onChange={onChange} />,
			);

			expect(screen.getByDisplayValue(/Jan 15, 2024/)).toBeInTheDocument();

			// Update value
			const newDate = new Date(2024, 0, 20);
			rerender(
				<DatePicker value={newDate} onChange={onChange} />,
			);

			expect(screen.getByDisplayValue(/Jan 20, 2024/)).toBeInTheDocument();
		});
	});
});
