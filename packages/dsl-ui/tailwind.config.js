/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{ts,tsx}'],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				primary: 'var(--color-primary)',
				border: 'var(--color-border)',
				surface: 'var(--color-surface)',
				content: 'var(--color-content)',
				muted: 'var(--color-muted)',
				'muted-bg': 'var(--color-muted-bg)',
				'bg-secondary': 'var(--color-bg-secondary)',
				danger: 'var(--color-danger)',
				'danger-bg': 'var(--color-danger-bg)',
				'danger-text': 'var(--color-danger-text)',
				success: 'var(--color-success)',
				'success-bg': 'var(--color-success-bg)',
				'success-text': 'var(--color-success-text)',
				'primary-light': 'var(--color-primary-light)',
				'warning-bg':   'var(--color-warning-bg)',
				'warning-text': 'var(--color-warning-text)',
				'info-bg':      'var(--color-info-bg)',
				'info-text':    'var(--color-info-text)',
			},
		},
	},
	safelist: [
		// ColorPicker swatches
		'bg-blue-500', 'bg-violet-500', 'bg-orange-500',
		'bg-green-500', 'bg-rose-500', 'bg-teal-500',
	],
	plugins: [],
};
