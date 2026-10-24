export type BrainFn = (params: Record<string, unknown>) => Promise<unknown>;

export type BrainRegistry = Record<string, BrainFn>;

export interface SimpleBrainSpec {
	$brain: string;
	$outputs?: string[];
	$reload?: string[];
	/**
	 * true = for `$http.*` and `$ctx.navigate`: percent-encode the values filled into `{placeholder}`s and fail before
	 * any request/navigation when one has no value. Not forwarded to the brain as a parameter.
	 */
	strictParams?: boolean;
	[param: string]: unknown;
}

export interface ChainStepSpec {
	/** The step's own label (used by `$chain.<id>.<field>`); never a URL value for built-in `$http.*` / `$ctx.navigate` steps. */
	id: string;
	$brain: string;
	$outputs?: string[];
	/** Overrides the chain-level `strictParams` for this step. */
	strictParams?: boolean;
	[param: string]: unknown;
}

export interface ChainBrainSpec {
	$chain: ChainStepSpec[];
	$reload?: string[];
	/** Default `strictParams` of every step (a step can override it). */
	strictParams?: boolean;
	[param: string]: unknown;
}

export type RawBrainSpec = SimpleBrainSpec | ChainBrainSpec;
