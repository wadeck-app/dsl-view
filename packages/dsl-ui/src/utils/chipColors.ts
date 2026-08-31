export type ChipColor = 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'cyan';

export interface ChipColorClasses {
	active: string;
	inactive: string;
}

export const CHIP_COLOR_CLASSES: Record<ChipColor, ChipColorClasses> = {
	blue: {
		active: 'border-blue-400 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
		inactive:
			'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-300 hover:text-blue-600',
	},
	green: {
		active: 'border-green-400 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
		inactive:
			'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-green-300 hover:text-green-600',
	},
	yellow: {
		active: 'border-yellow-400 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
		inactive:
			'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-yellow-300 hover:text-yellow-600',
	},
	orange: {
		active: 'border-orange-400 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
		inactive:
			'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-orange-300 hover:text-orange-600',
	},
	red: {
		active: 'border-red-400 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
		inactive:
			'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-red-300 hover:text-red-600',
	},
	purple: {
		active: 'border-purple-400 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
		inactive:
			'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-purple-300 hover:text-purple-600',
	},
	cyan: {
		active: 'border-cyan-400 bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300',
		inactive:
			'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-cyan-300 hover:text-cyan-600',
	},
};

export const DEFAULT_CHIP_COLORS: ChipColorClasses = {
	active: 'border-gray-500 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200',
	inactive: 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400',
};
