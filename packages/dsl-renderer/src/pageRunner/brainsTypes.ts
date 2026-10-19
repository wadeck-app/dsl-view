export type BrainFn = (params: Record<string, unknown>) => Promise<unknown>;

export type BrainRegistry = Record<string, BrainFn>;

export interface SimpleBrainSpec {
	$brain: string;
	$outputs?: string[];
	$reload?: string[];
	/** false = a failure of this brain is only logged / published as `$brains.<id>.$error`, not shown as feedback. */
	$notify?: boolean;
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
	/** false = a failure of this brain is only logged / published as `$brains.<id>.$error`, not shown as feedback. */
	$notify?: boolean;
	[param: string]: unknown;
}

export type RawBrainSpec = SimpleBrainSpec | ChainBrainSpec;
