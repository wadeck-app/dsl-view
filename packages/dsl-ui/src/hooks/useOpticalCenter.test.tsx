import { render } from '@testing-library/react';
import { useRef, type CSSProperties } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { opticalOffset, useOpticalCenter, type InkMetrics } from './useOpticalCenter.js';

describe('opticalOffset', () => {
	// Inter-like numbers at 11px.
	const base: InkMetrics = { width: 14, inkLeft: 0, inkRight: 14, fontAscent: 10.66, fontDescent: 2.66, capHeight: 8, lineHeight: 11 };

	it('needs no offset when the ink fills the advance box and the caps are centered in the line', () => {
		const { x, y } = opticalOffset(base);
		expect(x).toBeCloseTo(0);
		expect(y).toBeCloseTo(0, 0);
	});

	it('shifts right an ink that sits left of the box center, left one that sits right of it', () => {
		// "BI"-like: advance 14 but the ink spans only x = 1..10 -> ink center 5.5 < 7.
		expect(opticalOffset({ ...base, inkLeft: -1, inkRight: 10 }).x).toBeCloseTo(1.5);
		// Ink spans x = 4..14 -> ink center 9 > 7.
		expect(opticalOffset({ ...base, inkLeft: -4, inkRight: 14 }).x).toBeCloseTo(-2);
	});

	it('moves the caps down when the baseline sits too high in the line box', () => {
		expect(opticalOffset({ ...base, fontAscent: 8, fontDescent: 3 }).y).toBeGreaterThan(0);
	});
});

// jsdom has no 2D canvas (test-setup stubs getContext to null); this one answers with fixed metrics.
const fakeContext = (ink: { left: number; right: number }) =>
	({
		font: '',
		letterSpacing: '',
		measureText: (text: string) =>
			text === 'H'
				? { width: 8, actualBoundingBoxLeft: 0, actualBoundingBoxRight: 8, actualBoundingBoxAscent: 8, fontBoundingBoxAscent: 10.66, fontBoundingBoxDescent: 2.66 }
				: { width: 14, actualBoundingBoxLeft: ink.left, actualBoundingBoxRight: ink.right, actualBoundingBoxAscent: 8, fontBoundingBoxAscent: 10.66, fontBoundingBoxDescent: 2.66 },
	}) as unknown as CanvasRenderingContext2D;

function Probe({ enabled }: { enabled: boolean }) {
	const ref = useRef<HTMLSpanElement>(null);
	useOpticalCenter(ref, 'BI', enabled, []);
	return (
		<span ref={ref} data-testid="probe" style={{ fontSize: '11px', lineHeight: '11px' }}>
			BI
		</span>
	);
}

describe('useOpticalCenter', () => {
	const original = HTMLCanvasElement.prototype.getContext;
	afterEach(() => {
		HTMLCanvasElement.prototype.getContext = original;
	});

	const withInk = (left: number, right: number) => {
		HTMLCanvasElement.prototype.getContext = (() => fakeContext({ left, right })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
	};

	it('shifts the text so its measured ink is centered (ink 1..10 in a 14px box -> +1.5px)', () => {
		withInk(-1, 10);
		const { getByTestId } = render(<Probe enabled />);
		expect(getByTestId('probe').style.transform).toMatch(/^translate\(1\.50px, -?0\.00px\)$/);
	});

	it('shifts the other way for an ink that sits right of the center (ink 4..14 -> -2px)', () => {
		withInk(-4, 14);
		const { getByTestId } = render(<Probe enabled />);
		expect(getByTestId('probe').style.transform).toMatch(/^translate\(-2\.00px, -?0\.00px\)$/);
	});

	it('clears the transform when the effect is switched off', () => {
		withInk(-1, 10);
		const { getByTestId, rerender } = render(<Probe enabled />);
		expect(getByTestId('probe').style.transform).not.toBe('');
		rerender(<Probe enabled={false} />);
		expect(getByTestId('probe').style.transform).toBe('');
	});

	it('does not write a NaN transform when a metric is missing', () => {
		HTMLCanvasElement.prototype.getContext = (() => ({ font: '', measureText: () => ({ width: 14 }) })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
		const { getByTestId } = render(<Probe enabled />);
		expect(getByTestId('probe').style.transform).toBe('');
	});

	it('applies no transform where the canvas cannot measure (jsdom): the text keeps its default centering', () => {
		const { getByTestId } = render(<Probe enabled />);
		expect(getByTestId('probe').style.transform).toBe('');
	});

	it('applies nothing when disabled', () => {
		withInk(-1, 10);
		const { getByTestId } = render(<Probe enabled={false} />);
		expect(getByTestId('probe').style.transform).toBe('');
	});

	describe('re-measuring once the fonts are loaded', () => {
		function TextProbe({ text }: { text: string }) {
			const ref = useRef<HTMLSpanElement>(null);
			useOpticalCenter(ref, text, true, []);
			return (
				<span ref={ref} data-testid="probe" style={{ fontSize: '11px', lineHeight: '11px' }}>
					{text}
				</span>
			);
		}

		// Ink depends on the text: "BI" is 1..10 in a 14px box (+1.5px), "RE" is 4..14 (-2px).
		const textDependentContext = () => {
			const ctx = {
				font: '',
				letterSpacing: '',
				measureText: (text: string) => {
					const ink = text === 'RE' ? { left: -4, right: 14 } : { left: -1, right: 10 };
					return text === 'H'
						? { width: 8, actualBoundingBoxLeft: 0, actualBoundingBoxRight: 8, actualBoundingBoxAscent: 8, fontBoundingBoxAscent: 10.66, fontBoundingBoxDescent: 2.66 }
						: { width: 14, actualBoundingBoxLeft: ink.left, actualBoundingBoxRight: ink.right, actualBoundingBoxAscent: 8, fontBoundingBoxAscent: 10.66, fontBoundingBoxDescent: 2.66 };
				},
			};
			HTMLCanvasElement.prototype.getContext = (() => ctx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
		};

		// document.fonts.ready as a promise the test settles by hand, a new one at each read.
		const resolvers: Array<() => void> = [];
		afterEach(() => {
			resolvers.length = 0;
			Reflect.deleteProperty(document, 'fonts');
		});
		const controlFonts = () => {
			Object.defineProperty(document, 'fonts', {
				configurable: true,
				get: () => ({ ready: new Promise<void>(resolve => resolvers.push(resolve)) }),
			});
		};

		it('measures again when the fonts become ready', async () => {
			textDependentContext();
			controlFonts();
			const { getByTestId } = render(<TextProbe text="BI" />);
			getByTestId('probe').style.transform = '';
			resolvers[0]!();
			await Promise.resolve();
			await Promise.resolve();
			expect(getByTestId('probe').style.transform).toMatch(/^translate\(1\.50px/);
		});

		it('ignores a late measurement of a text that has since changed', async () => {
			textDependentContext();
			controlFonts();
			const { getByTestId, rerender } = render(<TextProbe text="BI" />);
			rerender(<TextProbe text="RE" />);
			expect(getByTestId('probe').style.transform).toMatch(/^translate\(-2\.00px/);

			// The newer measurement settles first; the older one settles last and must not overwrite it.
			resolvers[1]!();
			resolvers[0]!();
			await Promise.resolve();
			await Promise.resolve();
			expect(getByTestId('probe').style.transform).toMatch(/^translate\(-2\.00px/);
		});

		it('does not touch the element after it was removed', async () => {
			textDependentContext();
			controlFonts();
			const { getByTestId, unmount } = render(<TextProbe text="BI" />);
			const span = getByTestId('probe');
			span.style.transform = 'none';
			unmount();
			resolvers[0]!();
			await Promise.resolve();
			await Promise.resolve();
			expect(span.style.transform).toBe('none');
		});
	});

	describe('text styling given to the canvas', () => {
		function StyledProbe({ style }: { style: CSSProperties }) {
			const ref = useRef<HTMLSpanElement>(null);
			useOpticalCenter(ref, 'BI', true, []);
			return (
				<span ref={ref} data-testid="probe" style={style}>
					BI
				</span>
			);
		}

		// Records what the hook asked the canvas to use, while answering with fixed metrics.
		const recordingContext = () => {
			const ctx = fakeContext({ left: -1, right: 10 }) as unknown as { font: string; letterSpacing: string };
			HTMLCanvasElement.prototype.getContext = (() => ctx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
			return ctx;
		};

		it('measures with the element font and its letter spacing', () => {
			const ctx = recordingContext();
			render(<StyledProbe style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', lineHeight: '11px' }} />);
			expect(ctx.letterSpacing).toBe('2px');
			expect(ctx.font).toContain('11px');
			expect(ctx.font).toContain('700');
		});

		it('turns a "normal" letter spacing into 0px, which a canvas understands', () => {
			const ctx = recordingContext();
			render(<StyledProbe style={{ fontSize: '11px', letterSpacing: 'normal', lineHeight: '11px' }} />);
			expect(ctx.letterSpacing).toBe('0px');
		});

		it('still measures when the line height is "normal" (derived from the font size)', () => {
			recordingContext();
			const { getByTestId } = render(<StyledProbe style={{ fontSize: '10px', lineHeight: 'normal' }} />);
			expect(getByTestId('probe').style.transform).toMatch(/^translate\(1\.50px, -?0\.00px\)$/);
		});

		it('does not set a letter spacing on a canvas that has none', () => {
			// A canvas without the property at all: the same fake, minus `letterSpacing`.
			const { letterSpacing: _omitted, ...ctx } = fakeContext({ left: -1, right: 10 }) as CanvasRenderingContext2D;
			HTMLCanvasElement.prototype.getContext = (() => ctx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
			render(<StyledProbe style={{ fontSize: '11px', letterSpacing: '2px', lineHeight: '11px' }} />);
			expect('letterSpacing' in ctx).toBe(false);
		});
	});
});
