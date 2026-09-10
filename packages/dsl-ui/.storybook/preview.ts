import type { Preview } from '@storybook/react-vite';

import '../src/storybook.css';

const preview: Preview = {
	parameters: {
		layout: 'padded',
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
	},
};

export default preview;
