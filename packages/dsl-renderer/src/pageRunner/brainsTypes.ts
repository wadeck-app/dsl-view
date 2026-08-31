export type BrainFn = (params: Record<string, unknown>) => Promise<unknown>;

export type BrainRegistry = Record<string, BrainFn>;

export interface SimpleBrainSpec {
	$brain: string;
	$outputs?: string[];
	$reload?: string[];
	[param: string]: unknown;
}

export interface ChainStepSpec {
	id: string;
	$brain: string;
	$outputs?: string[];
	[param: string]: unknown;
}

export interface ChainBrainSpec {
	$chain: ChainStepSpec[];
	$reload?: string[];
	[param: string]: unknown;
}

export type RawBrainSpec = SimpleBrainSpec | ChainBrainSpec;
