import React from 'react';
import { Surface } from 'recharts';

export type SwatchShape = 'bar' | 'area' | 'line' | 'dot' | 'range';

export interface ChartSwatchProps {
	shape: SwatchShape;
	/** Any CSS colour: a series colour, or a theme token such as `var(--color-primary-solid)`. */
	color: string;
	/** `line`: thickness in px (2 to 5). `range`: opacity of the fill. */
	amount?: number;
}

const HEIGHT = 10;

/**
 * Legend marker. Drawn on a recharts `Surface` (the svg root recharts itself uses) with the colour as a paint attribute,
 * so a series colour that comes from the data never has to be an inline style.
 */
export function ChartSwatch({ shape, color, amount = 2 }: ChartSwatchProps): React.ReactElement {
	if (shape === 'dot') {
		return (
			<Surface width={HEIGHT} height={HEIGHT} className="shrink-0" aria-hidden="true">
				<circle cx={5} cy={5} r={5} fill={color} />
			</Surface>
		);
	}
	if (shape === 'bar') {
		return (
			<Surface width={12} height={HEIGHT} className="shrink-0" aria-hidden="true">
				<rect x={0} y={0} width={12} height={HEIGHT} rx={2} fill={color} fillOpacity={0.75} />
			</Surface>
		);
	}
	if (shape === 'area') {
		return (
			<Surface width={16} height={HEIGHT} className="shrink-0" aria-hidden="true">
				<rect x={0} y={0} width={16} height={HEIGHT} fill={color} fillOpacity={0.25} />
				<line x1={0} y1={1} x2={16} y2={1} stroke={color} strokeWidth={2} />
			</Surface>
		);
	}
	if (shape === 'range') {
		return (
			<Surface width={14} height={HEIGHT} className="shrink-0" aria-hidden="true">
				<rect x={0} y={0} width={14} height={HEIGHT} rx={2} fill={color} fillOpacity={amount} />
			</Surface>
		);
	}
	const thickness = Math.max(2, Math.min(5, amount));
	return (
		<Surface width={16} height={HEIGHT} className="shrink-0" aria-hidden="true">
			<rect x={0} y={(HEIGHT - thickness) / 2} width={16} height={thickness} rx={1} fill={color} />
		</Surface>
	);
}
