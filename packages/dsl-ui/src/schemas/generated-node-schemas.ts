// src/schemas/generated-node-schemas.ts — GENERATED from XxxProps interfaces by scripts/generate-node-schemas.ts, do not edit
import { z } from 'zod';

// Directives every DSL node may carry (mirrors KNOWN_DSL_KEYS in dsl-renderer, a test keeps them in sync).
// A node is authored with `$type`, never `type`: `type` is an ordinary prop of some components (Chart, ButtonAction).
// Other keys are not rejected here: unknown keys are reported by the knownKeys check, not twice.
const baseNode = z.object({
	$type: z.string(),
	$if: z.unknown().optional(),
	$source: z.unknown().optional(),
	$context: z.unknown().optional(),
	$route: z.unknown().optional(),
	$extends: z.unknown().optional(),
	$id: z.unknown().optional(),
	$outputs: z.unknown().optional(),
});

// A prop may hold an expression (`$sources.x`, `!$vars.y`, `$a != $b`) resolved at render time, so it is accepted wherever the literal is.
const expr = z.string().regex(/^\s*(?:\$|!+\s*[$(])/);
const dsl = <T extends z.ZodType>(schema: T) => z.union([schema, expr]);

export const ActionButtonNodeSchema = baseNode.extend({
	action: z.string(),
	label: z.string(),
	params: dsl(z.record(z.string(), z.unknown())).optional(),
	body: dsl(z.record(z.string(), z.unknown())).optional(),
	icon: z.string().optional(),
	iconOnly: dsl(z.boolean()).optional(),
	variant: dsl(z.enum(['primary', 'secondary', 'danger', 'danger-outline', 'success', 'neutral', 'ghost'])).optional(),
	size: dsl(z.enum(['sm', 'md'])).optional(),
	disabled: dsl(z.boolean()).optional(),
	disabledReason: z.string().optional(),
	actionPending: dsl(z.record(z.string(), z.boolean())).optional(),
});

export const ButtonActionNodeSchema = baseNode.extend({
	label: z.string(),
	variant: dsl(z.enum(['primary', 'secondary', 'danger', 'danger-outline', 'success'])).optional(),
	icon: dsl(z.array(z.unknown())).optional(),
	size: dsl(z.enum(['sm', 'md'])).optional(),
	disabled: dsl(z.boolean()).optional(),
	disabledReason: z.string().optional(),
	loading: dsl(z.boolean()).optional(),
	type: dsl(z.enum(['button', 'submit'])).optional(),
});

const CheckboxOptionSchema = z.object({
	value: z.string(),
	label: z.string(),
	disabled: z.boolean().optional(),
});

export const CheckboxGroupNodeSchema = baseNode.extend({
	bind: z.string().optional(),
	options: dsl(z.array(CheckboxOptionSchema)),
	label: z.string().optional(),
	orientation: dsl(z.enum(['vertical', 'horizontal'])).optional(),
});

export const ChipButtonNodeSchema = baseNode.extend({
	active: dsl(z.boolean()),
	color: z.unknown().optional(),
	items: dsl(z.array(z.unknown())).optional(),
	shape: dsl(z.enum(['pill', 'square'])).optional(),
	emphasis: dsl(z.enum(['subtle', 'strong'])).optional(),
	'aria-pressed': dsl(z.boolean()).optional(),
	'aria-label': z.string().optional(),
	title: z.string().optional(),
	className: z.string().optional(),
});

const ColorOptionSchema = z.object({
	value: z.string(),
	label: z.string(),
});

export const ColorPickerNodeSchema = baseNode.extend({
	bind: z.string().optional(),
	label: z.string(),
	options: dsl(z.array(ColorOptionSchema)),
});

export const CompactSelectNodeSchema = baseNode.extend({
	bind: z.string().optional(),
	urlParam: z.string().optional(),
	resetUrlParams: dsl(z.array(z.string())).optional(),
	options: dsl(z.array(z.unknown())),
	ariaLabel: z.string(),
	placeholder: z.string().optional(),
	disabled: dsl(z.boolean()).optional(),
});

export const IconButtonNodeSchema = baseNode.extend({
	icon: dsl(z.array(z.unknown())).optional(),
	'aria-label': z.string(),
	size: dsl(z.enum(['icon', 'icon-field', 'icon-sm', 'icon-xs'])).optional(),
});

export const LiveToggleNodeSchema = baseNode.extend({
	live: dsl(z.boolean()).optional(),
	urlParam: z.string().optional(),
});

export const PageSizeSelectNodeSchema = baseNode.extend({
	urlParam: z.string().optional(),
	resetUrlParams: dsl(z.array(z.string())).optional(),
	value: dsl(z.number()).optional(),
	options: dsl(z.array(z.number())),
	default: dsl(z.number()).optional(),
});

const RadioOptionSchema = z.object({
	value: z.string(),
	label: z.string(),
	disabled: z.boolean().optional(),
});

export const RadioGroupNodeSchema = baseNode.extend({
	bind: z.string().optional(),
	options: dsl(z.array(RadioOptionSchema)),
	label: z.string().optional(),
	orientation: dsl(z.enum(['vertical', 'horizontal'])).optional(),
});

export const RefreshButtonNodeSchema = baseNode.extend({
	loading: dsl(z.boolean()).optional(),
	source: z.string().optional(),
	label: z.string().default('Refresh'),
});

export const SliderNodeSchema = baseNode.extend({
	bind: z.string().optional(),
	min: dsl(z.number()).optional(),
	max: dsl(z.number()).optional(),
	step: dsl(z.number()).optional(),
	disabled: dsl(z.boolean()).optional(),
	label: z.string().optional(),
	showValue: dsl(z.boolean()).optional(),
});

export const SwitchNodeSchema = baseNode.extend({
	bind: z.string().optional(),
	label: z.string().optional(),
	disabled: dsl(z.boolean()).optional(),
	size: dsl(z.enum(['sm', 'md'])).optional(),
});

export const TabButtonNodeSchema = baseNode.extend({
	active: dsl(z.boolean()).optional(),
});

const ThemeOptionSchema = z.object({
	value: z.string(),
	label: z.string(),
	icon: z.string(),
});

export const ThemePickerNodeSchema = baseNode.extend({
	bind: z.string().optional(),
	label: z.string(),
	options: dsl(z.array(ThemeOptionSchema)),
});

const AbVariantSpecSchema = z.object({
	label: z.string(),
	hint: z.string(),
	view: z.unknown(),
});

export const AbTestNodeSchema = baseNode.extend({
	id: z.string(),
	label: z.string(),
	initial: z.string(),
	variants: dsl(z.record(z.string(), AbVariantSpecSchema)),
});

export const AvatarNodeSchema = baseNode.extend({
	src: z.string().optional(),
	alt: z.string().optional(),
	fallback: z.string().optional(),
	size: dsl(z.enum(['sm', 'md', 'lg'])).optional(),
});

export const BadgeNodeSchema = baseNode.extend({
	label: z.string(),
	variant: dsl(z.enum(['default', 'primary', 'success', 'warning', 'danger', 'info'])).optional(),
	tone: dsl(z.enum(['solid', 'subtle'])).optional(),
	size: dsl(z.enum(['sm', 'md'])).optional(),
	href: z.string().optional(),
	external: dsl(z.boolean()).optional(),
});

const ChartSeriesConfigSchema = z.object({
	key: z.string(),
	name: z.string(),
	color: z.string().optional(),
	type: z.enum(['line', 'bar', 'area']).default('line'),
	yAxisId: z.enum(['left', 'right']).default('left'),
});

export const ChartNodeSchema = baseNode.extend({
	data: dsl(z.array(z.unknown())).optional(),
	xAxisKey: z.string(),
	xAxisType: dsl(z.enum(['time', 'category'])),
	xFormat: z.unknown().default('date'),
	yFormat: z.unknown().default('bytes'),
	yUnit: z.string().optional(),
	variant: dsl(z.enum(['default', 'sparkline'])).default('default'),
	showLegend: dsl(z.boolean()).optional(),
	height: dsl(z.number()).default(300),
	series: dsl(z.array(ChartSeriesConfigSchema)),
});

export const FetchSpinnerNodeSchema = baseNode.extend({
	loading: dsl(z.boolean()),
});

export const JsonViewerNodeSchema = baseNode.extend({
	row: dsl(z.record(z.string(), z.unknown())).optional(),
	field: z.string().optional(),
	maxHeight: z.string().optional(),
});

export const MarkdownNodeSchema = baseNode.extend({
	text: z.string().optional(),
	maxHeight: z.string().optional(),
	collapsed: dsl(z.boolean()).optional(),
	allowImages: dsl(z.boolean()).optional(),
});

export const PageHeaderNodeSchema = baseNode.extend({
	title: z.string(),
	subtitle: z.string().optional(),
	icon: dsl(z.union([z.unknown(), z.unknown()])).optional(),
	headerActions: dsl(z.array(z.unknown())).optional(),
	size: dsl(z.enum(['default', 'sm'])).optional(),
});

export const ProgressNodeSchema = baseNode.extend({
	value: dsl(z.number()),
	max: dsl(z.number()).optional(),
	variant: dsl(z.enum(['default', 'success', 'danger'])).optional(),
	label: z.string().optional(),
	showValue: dsl(z.boolean()).optional(),
	size: dsl(z.enum(['sm', 'md'])).optional(),
	layout: dsl(z.enum(['stacked', 'inline'])).optional(),
	valueLabel: z.string().optional(),
});

export const RelativeDateNodeSchema = baseNode.extend({
	date: dsl(z.union([z.unknown(), z.string(), z.number()])),
	className: z.string().optional(),
	live: dsl(z.boolean()).default(true),
	tooltip: dsl(z.boolean()).default(true),
	format: z.string().optional(),
});

export const SkeletonNodeSchema = baseNode.extend({
	width: z.string().optional(),
	height: z.string().optional(),
	variant: dsl(z.enum(['line', 'circle', 'block'])).optional(),
	count: dsl(z.number()).optional(),
	decorative: dsl(z.boolean()).optional(),
});

export const SpinnerNodeSchema = baseNode.extend({
	size: dsl(z.enum(['sm', 'md', 'lg'])).optional(),
	label: z.string().optional(),
});

export const TagNodeSchema = baseNode.extend({
	label: z.string(),
	color: dsl(z.enum(['default', 'blue', 'green', 'red', 'yellow', 'purple'])).optional(),
});

export const ButtonCancelNodeSchema = baseNode.extend({
	label: z.string().optional(),
	disabled: dsl(z.boolean()).optional(),
});

export const ButtonSaveNodeSchema = baseNode.extend({
	label: z.string().optional(),
	isPending: dsl(z.boolean()).optional(),
	hasChanges: dsl(z.boolean()).optional(),
	disabledReason: z.string().optional(),
});

export const CronBuilderNodeSchema = baseNode.extend({
	value: z.string(),
});

export const DatePickerNodeSchema = baseNode.extend({
	bind: z.string().optional(),
	minDate: z.unknown().optional(),
	maxDate: z.unknown().optional(),
	placeholder: z.string().optional(),
	disabled: dsl(z.boolean()).optional(),
	dateFormat: z.string().optional(),
});

const DateRangeSchema = z.object({
	from: z.unknown().nullable(),
	to: z.unknown().nullable(),
});

export const DateRangePickerNodeSchema = baseNode.extend({
	bind: z.string().optional(),
	disabled: dsl(z.boolean()).optional(),
	minDate: z.unknown().optional(),
	maxDate: z.unknown().optional(),
	placeholder: z.string().optional(),
	dateFormat: z.string().optional(),
	open: dsl(z.boolean()).optional(),
});

const FieldAsyncSelectOptionSchema = z.object({
	label: z.string(),
	value: z.string(),
});

export const FieldAsyncSelectNodeSchema = baseNode.extend({
	bind: z.string().optional(),
	name: z.string().optional(),
	label: z.string(),
	description: z.string().optional(),
	required: dsl(z.boolean()).optional(),
	error: z.string().optional(),
	disabled: dsl(z.boolean()).optional(),
	placeholder: z.string().optional(),
	debounceMs: dsl(z.number()).optional(),
	noOptionsMessage: z.string().optional(),
});

const FieldAutocompleteOptionSchema = z.object({
	value: z.string(),
	label: z.string(),
});

export const FieldAutocompleteNodeSchema = baseNode.extend({
	bind: z.string().optional(),
	label: z.string(),
	description: z.string().optional(),
	options: dsl(z.array(FieldAutocompleteOptionSchema)),
	placeholder: z.string().optional(),
	disabled: dsl(z.boolean()).optional(),
});

export const FieldDateNodeSchema = baseNode.extend({
	bind: z.string().optional(),
	label: z.string(),
	description: z.string().optional(),
	minDate: z.unknown().optional(),
	maxDate: z.unknown().optional(),
	placeholder: z.string().optional(),
	disabled: dsl(z.boolean()).optional(),
	dateFormat: z.string().optional(),
	required: dsl(z.boolean()).optional(),
	error: z.string().optional(),
});

export const FieldDateRangeNodeSchema = baseNode.extend({
	bind: z.string().optional(),
	label: z.string(),
	description: z.string().optional(),
	minDate: z.unknown().optional(),
	maxDate: z.unknown().optional(),
	placeholder: z.string().optional(),
	disabled: dsl(z.boolean()).optional(),
	dateFormat: z.string().optional(),
	required: dsl(z.boolean()).optional(),
	error: z.string().optional(),
});

export const FieldDateTimeNodeSchema = baseNode.extend({
	bind: z.string().optional(),
	label: z.string(),
	description: z.string().optional(),
	minDate: z.unknown().optional(),
	maxDate: z.unknown().optional(),
	datePlaceholder: z.string().optional(),
	timePlaceholder: z.string().optional(),
	disabled: dsl(z.boolean()).optional(),
	dateFormat: z.string().optional(),
	is12Hour: dsl(z.boolean()).optional(),
	minuteStep: dsl(z.number()).optional(),
	required: dsl(z.boolean()).optional(),
	error: z.string().optional(),
	open: dsl(z.boolean()).optional(),
});

const FieldMultiSelectOptionSchema = z.object({
	value: z.string(),
	label: z.string(),
});

export const FieldMultiSelectNodeSchema = baseNode.extend({
	bind: z.string().optional(),
	name: z.string().optional(),
	label: z.string(),
	description: z.string().optional(),
	required: dsl(z.boolean()).optional(),
	error: z.string().optional(),
	disabled: dsl(z.boolean()).optional(),
	options: dsl(z.array(FieldMultiSelectOptionSchema)),
	placeholder: z.string().optional(),
	maxSelected: dsl(z.number()).optional(),
});

export const FieldNumberNodeSchema = baseNode.extend({
	bind: z.string().optional(),
	label: z.string(),
	description: z.string().optional(),
	min: dsl(z.number()).optional(),
	max: dsl(z.number()).optional(),
	suffix: z.string().optional(),
	disabled: dsl(z.boolean()).optional(),
	required: dsl(z.boolean()).optional(),
	error: z.string().optional(),
	unlimited: z.string().optional(),
	unlimitedValue: dsl(z.boolean()).optional(),
});

export const FieldReadOnlyNodeSchema = baseNode.extend({
	label: z.string(),
	description: z.string().optional(),
	value: z.string(),
	mono: dsl(z.boolean()).optional(),
	copyable: dsl(z.boolean()).optional(),
});

const FieldSelectOptionSchema = z.object({
	value: z.string(),
	label: z.string(),
});

export const FieldSelectNodeSchema = baseNode.extend({
	bind: z.string().optional(),
	label: z.string(),
	description: z.string().optional(),
	options: dsl(z.array(FieldSelectOptionSchema)),
	placeholder: z.string().optional(),
	disabled: dsl(z.boolean()).optional(),
	required: dsl(z.boolean()).optional(),
	error: z.string().optional(),
});

export const FieldTagsNodeSchema = baseNode.extend({
	bind: z.string().optional(),
	name: z.string().optional(),
	label: z.string(),
	description: z.string().optional(),
	required: dsl(z.boolean()).optional(),
	error: z.string().optional(),
	disabled: dsl(z.boolean()).optional(),
	placeholder: z.string().optional(),
	maxTags: dsl(z.number()).optional(),
	allowDuplicates: dsl(z.boolean()).default(false),
});

export const FieldTextNodeSchema = baseNode.extend({
	bind: z.string().optional(),
	label: z.string(),
	description: z.string().optional(),
	readOnly: dsl(z.boolean()).optional(),
	required: dsl(z.boolean()).optional(),
	error: z.string().optional(),
});

export const FieldTextareaNodeSchema = baseNode.extend({
	bind: z.string().optional(),
	label: z.string(),
	description: z.string().optional(),
	rows: dsl(z.number()).optional(),
	mono: dsl(z.boolean()).optional(),
	placeholder: z.string().optional(),
	readOnly: dsl(z.boolean()).optional(),
	disabled: dsl(z.boolean()).optional(),
	required: dsl(z.boolean()).optional(),
	error: z.string().optional(),
});

export const FieldTimeNodeSchema = baseNode.extend({
	bind: z.string().optional(),
	label: z.string(),
	description: z.string().optional(),
	is12Hour: dsl(z.boolean()).optional(),
	minuteStep: dsl(z.number()).optional(),
	placeholder: z.string().optional(),
	disabled: dsl(z.boolean()).optional(),
	required: dsl(z.boolean()).optional(),
	error: z.string().optional(),
});

export const FieldWrapperNodeSchema = baseNode.extend({
	label: z.string(),
	description: z.string().optional(),
	required: dsl(z.boolean()).optional(),
	error: z.string().optional(),
	items: dsl(z.array(z.unknown())).optional(),
});

export const FormNodeSchema = baseNode.extend({
	fields: dsl(z.array(z.unknown())).optional(),
	actions: dsl(z.array(z.unknown())).optional(),
	initialData: dsl(z.record(z.string(), z.unknown())).optional(),
});

export const TimePickerNodeSchema = baseNode.extend({
	bind: z.string().optional(),
	is12Hour: dsl(z.boolean()).optional(),
	minuteStep: dsl(z.number()).optional(),
	disabled: dsl(z.boolean()).optional(),
	placeholder: z.string().optional(),
	open: dsl(z.boolean()).optional(),
});

export const UnsavedBadgeNodeSchema = baseNode.extend({
	hasChanges: dsl(z.boolean()).optional(),
});

export const ActionBarNodeSchema = baseNode.extend({
	items: dsl(z.array(z.unknown())).optional(),
	className: z.string().optional(),
});

export const CardNodeSchema = baseNode.extend({
	items: dsl(z.array(z.unknown())).optional(),
	className: z.string().optional(),
	padding: dsl(z.enum(['none', 'sm', 'md', 'lg'])).optional(),
	shadow: dsl(z.boolean()).optional(),
	border: dsl(z.boolean()).optional(),
	header: dsl(z.array(z.unknown())).optional(),
	footer: dsl(z.array(z.unknown())).optional(),
});

export const CardActionsNodeSchema = baseNode.extend({
	items: dsl(z.array(z.unknown())).optional(),
	className: z.string().optional(),
});

export const CollapsibleNodeSchema = baseNode.extend({
	title: z.string(),
	defaultOpen: dsl(z.boolean()).optional(),
	items: dsl(z.array(z.unknown())).optional(),
});

export const DialogFooterNodeSchema = baseNode.extend({
	items: dsl(z.array(z.unknown())).optional(),
	className: z.string().optional(),
});

export const DividerNodeSchema = baseNode.extend({
	orientation: dsl(z.enum(['horizontal', 'vertical'])).optional(),
	label: z.string().optional(),
	className: z.string().optional(),
});

export const HorizontalStackNodeSchema = baseNode.extend({
	gap: dsl(z.enum(['gap-0', 'gap-0.5', 'gap-1', 'gap-1.5', 'gap-2', 'gap-2.5', 'gap-3', 'gap-4', 'gap-5', 'gap-6', 'gap-7', 'gap-8', 'gap-9', 'gap-10', 'gap-12', 'gap-16'])).optional(),
	align: dsl(z.enum(['items-start', 'items-center', 'items-end', 'items-stretch', 'items-baseline'])).optional(),
	justify: dsl(z.enum(['justify-start', 'justify-center', 'justify-end', 'justify-between', 'justify-around', 'justify-evenly'])).optional(),
	items: dsl(z.array(z.unknown())).optional(),
	itemSizes: dsl(z.array(z.enum(['fixed', 'flex']).optional())).optional(),
});

export const NavBarNodeSchema = baseNode.extend({
	items: dsl(z.array(z.unknown())).optional(),
	className: z.string().optional(),
});

export const PageContentNodeSchema = baseNode.extend({
	sections: dsl(z.array(z.unknown())).optional(),
	maxWidth: dsl(z.enum(['sm', 'md', 'lg', 'xl', '2xl', 'full'])).default('xl'),
});

export const PageSectionNodeSchema = baseNode.extend({
	title: z.string(),
	actions: dsl(z.array(z.unknown())).optional(),
	items: dsl(z.array(z.unknown())).optional(),
	className: z.string().optional(),
});

export const ScrollAreaNodeSchema = baseNode.extend({
	items: dsl(z.array(z.unknown())).optional(),
	scheme: dsl(z.enum(['auto', 'dark', 'light'])).optional(),
	axis: dsl(z.enum(['vertical', 'horizontal', 'both'])).optional(),
	className: z.string().optional(),
});

export const SectionNodeSchema = baseNode.extend({
	title: z.string().optional(),
	items: dsl(z.array(z.unknown())).optional(),
});

const StatTileTrendSchema = z.object({
	value: z.number(),
	direction: z.enum(['up', 'down', 'neutral']),
	label: z.string().optional(),
});

export const StatTileNodeSchema = baseNode.extend({
	label: z.string(),
	value: dsl(z.union([z.string(), z.number()])),
	trend: dsl(StatTileTrendSchema).optional(),
	icon: dsl(z.array(z.unknown())).optional(),
	loading: dsl(z.boolean()).optional(),
	className: z.string().optional(),
	href: z.string().optional(),
	external: dsl(z.boolean()).optional(),
});

export const TableRowActionsNodeSchema = baseNode.extend({
	items: dsl(z.array(z.unknown())).optional(),
	className: z.string().optional(),
});

export const ThemeScopeNodeSchema = baseNode.extend({
	theme: dsl(z.enum(['light', 'dark'])),
	surface: dsl(z.enum(['page', 'panel', 'none'])).optional(),
	tokens: dsl(z.record(z.string(), z.string())).optional(),
	className: z.string().optional(),
	items: dsl(z.array(z.unknown())).optional(),
});

export const VerticalStackNodeSchema = baseNode.extend({
	gap: dsl(z.enum(['gap-0', 'gap-0.5', 'gap-1', 'gap-1.5', 'gap-2', 'gap-2.5', 'gap-3', 'gap-4', 'gap-5', 'gap-6', 'gap-7', 'gap-8', 'gap-9', 'gap-10', 'gap-12', 'gap-16'])).optional(),
	items: dsl(z.array(z.unknown())).optional(),
});

export const BackLinkNodeSchema = baseNode.extend({
	to: z.string().optional(),
	label: z.string().optional(),
});

export const BreadcrumbNodeSchema = baseNode.extend({
	currentPath: z.string(),
});

export const ButtonLinkNodeSchema = baseNode.extend({
	to: z.string(),
	label: z.string(),
	icon: dsl(z.array(z.unknown())).optional(),
	variant: dsl(z.enum(['primary', 'secondary', 'danger', 'danger-outline', 'neutral', 'success'])).optional(),
	size: dsl(z.enum(['sm', 'md'])).optional(),
});

export const LinkNodeSchema = baseNode.extend({
	href: z.string(),
	label: z.string(),
	external: dsl(z.boolean()).optional(),
	variant: dsl(z.enum(['default', 'muted', 'danger'])).optional(),
});

const PageTabDefSchema = z.object({
	id: z.string(),
	label: z.string(),
	children: z.array(z.unknown()).optional(),
});

export const PageTabsNodeSchema = baseNode.extend({
	tabs: dsl(z.array(PageTabDefSchema)),
	activeTab: z.string().optional(),
	urlParam: z.string().optional(),
});

const StepperStepSchema = z.object({
	label: z.string(),
	description: z.string().optional(),
	items: z.array(z.unknown()).optional(),
});

export const StepperNodeSchema = baseNode.extend({
	steps: dsl(z.array(StepperStepSchema)),
	completedLabel: z.string().optional(),
	className: z.string().optional(),
});

const TabDefSchema = z.object({
	key: z.string(),
	label: z.string(),
	children: z.array(z.unknown()).optional(),
});

export const TabsNodeSchema = baseNode.extend({
	tabs: dsl(z.array(TabDefSchema)),
	defaultTab: z.string().optional(),
	value: z.string().optional(),
});

const TreeNodeSchema = z.object({
	id: z.string(),
	label: z.string(),
	icon: z.array(z.unknown()).optional(),
	children: z.array(z.unknown()).optional(),
	disabled: z.boolean().optional(),
	data: z.unknown().optional(),
});

export const TreeViewNodeSchema = baseNode.extend({
	nodes: dsl(z.array(TreeNodeSchema)),
	selectedId: z.string().optional(),
	defaultExpandedIds: dsl(z.array(z.string())).optional(),
	expandedIds: dsl(z.array(z.string())).optional(),
	className: z.string().optional(),
});

export const ConfirmDialogNodeSchema = baseNode.extend({
	open: dsl(z.boolean()),
	title: z.string(),
	message: dsl(z.array(z.unknown())).optional(),
	confirmLabel: z.string().optional(),
	confirmVariant: dsl(z.enum(['danger', 'primary'])).optional(),
});

const ContextMenuItemSchema = z.object({
	label: z.string(),
	icon: z.array(z.unknown()).optional(),
	disabled: z.boolean().optional(),
	danger: z.boolean().optional(),
	separator: z.boolean().optional(),
});

export const ContextMenuNodeSchema = baseNode.extend({
	trigger: dsl(z.array(z.unknown())).optional(),
	items: dsl(z.array(ContextMenuItemSchema)),
	side: dsl(z.enum(['top', 'right', 'bottom', 'left'])).optional(),
	align: dsl(z.enum(['start', 'center', 'end'])).optional(),
	open: dsl(z.boolean()).optional(),
});

export const DialogNodeSchema = baseNode.extend({
	title: z.string(),
	trigger: dsl(z.array(z.unknown())).optional(),
	open: dsl(z.boolean()).optional(),
	items: dsl(z.array(z.unknown())).optional(),
	actions: dsl(z.array(z.unknown())).optional(),
	size: dsl(z.enum(['sm', 'md', 'lg', 'xl'])).optional(),
});

export const DialogFormNodeSchema = baseNode.extend({
	title: z.string(),
	visible: z.unknown(),
	initialData: dsl(z.record(z.string(), z.unknown())).nullable().optional(),
	fields: dsl(z.array(z.unknown())).optional(),
	size: dsl(z.enum(['sm', 'md', 'lg', 'xl'])).optional(),
});

export const DrawerNodeSchema = baseNode.extend({
	open: dsl(z.boolean()),
	side: dsl(z.enum(['left', 'right', 'bottom'])).optional(),
	title: z.string().optional(),
	footer: dsl(z.array(z.unknown())).optional(),
	items: dsl(z.array(z.unknown())).optional(),
	size: dsl(z.enum(['sm', 'md', 'lg'])).optional(),
	hideCloseButton: dsl(z.boolean()).optional(),
});

export const PopoverNodeSchema = baseNode.extend({
	trigger: dsl(z.array(z.unknown())).optional(),
	items: dsl(z.array(z.unknown())).optional(),
	side: dsl(z.enum(['top', 'right', 'bottom', 'left'])).optional(),
	align: dsl(z.enum(['start', 'center', 'end'])).optional(),
	open: dsl(z.boolean()).optional(),
	className: z.string().optional(),
});

export const ToastProviderNodeSchema = baseNode.extend({
	items: dsl(z.array(z.unknown())).optional(),
});

export const TooltipNodeSchema = baseNode.extend({
	content: z.string(),
	items: dsl(z.array(z.unknown())).optional(),
});

export const BulkActionsToolbarNodeSchema = baseNode.extend({
	selectedCount: dsl(z.number()),
	items: dsl(z.array(z.unknown())).optional(),
});

const ActionDefSchema = z.object({
	label: z.string(),
	icon: z.array(z.unknown()).optional(),
	variant: z.enum(['primary', 'danger', 'danger-outline', 'ghost', 'success']).optional(),
	action: z.string(),
	condition: z.string().optional(),
});

const TableColumnSchema = z.object({
	key: z.string(),
	label: z.string(),
	mono: z.boolean().optional(),
	muted: z.boolean().optional(),
	format: z.enum(['datetime', 'date', 'time', 'bytes', 'ms']).optional(),
	width: z.number().optional(),
	truncate: z.boolean().optional(),
	nowrap: z.boolean().optional(),
	sortable: z.boolean().optional(),
	isActions: z.boolean().optional(),
	actions: z.array(ActionDefSchema).optional(),
	isLink: z.boolean().optional(),
	linkPosition: z.enum(['start', 'end']).optional(),
});

export const DataTableNodeSchema = baseNode.extend({
	rows: dsl(z.array(z.unknown())),
	columns: dsl(z.array(z.unknown())),
	loading: dsl(z.boolean()).optional(),
	refreshing: dsl(z.boolean()).optional(),
	emptyMessage: z.string().optional(),
	navigateTo: z.string().optional(),
	filtersTop: dsl(z.array(z.unknown())).optional(),
	filters: dsl(z.array(z.unknown())).optional(),
	id: z.string().optional(),
	rowKey: z.string().optional(),
	sortCol: z.string().optional(),
	sortDir: dsl(z.enum(['asc', 'desc'])).optional(),
	defaultFilters: dsl(z.record(z.string(), z.unknown())).optional(),
	expansion: dsl(z.record(z.string(), z.unknown())).optional(),
	selectable: dsl(z.boolean()).optional(),
	batchActions: dsl(z.array(z.object({
		label: z.string(),
		action: z.string(),
		variant: z.enum(['primary', 'danger', 'ghost', 'success']).optional(),
	}))).optional(),
	actionPending: dsl(z.record(z.string(), z.boolean())).optional(),
	actionPendingRows: dsl(z.record(z.string(), z.array(z.string()))).optional(),
	batchActionsPosition: dsl(z.enum(['floating', 'bottom'])).optional(),
	expansionCondition: z.string().optional(),
	expandLabel: z.string().optional(),
	collapseLabel: z.string().optional(),
	fontMono: dsl(z.boolean()).optional(),
});

const FilterBarFilterSchema = z.object({
	key: z.string(),
	label: z.string(),
	value: z.string(),
	active: z.boolean(),
	color: z.string().optional(),
});

export const FilterBarNodeSchema = baseNode.extend({
	search: z.string().optional(),
	filters: dsl(z.array(FilterBarFilterSchema)).optional(),
	placeholder: z.string().optional(),
	className: z.string().optional(),
});

const FilterChipOptionSchema = z.object({
	value: z.string(),
	label: z.string(),
	color: z.string().optional(),
});

export const FilterChipsNodeSchema = baseNode.extend({
	bind: z.string(),
	options: dsl(z.array(FilterChipOptionSchema)),
	value: dsl(z.array(z.string())),
	mode: dsl(z.enum(['multi', 'single'])).optional(),
});

export const PaginationNodeSchema = baseNode.extend({
	urlParam: z.string().optional(),
	page: dsl(z.number()).optional(),
	total: dsl(z.number()),
	size: dsl(z.number()),
});

export const SearchBarNodeSchema = baseNode.extend({
	urlParam: z.string().optional(),
	resetUrlParams: dsl(z.array(z.string())).optional(),
	value: z.string().optional(),
	placeholder: z.string().optional(),
	debounceMs: dsl(z.number()).optional(),
	focusExpand: dsl(z.boolean()).optional(),
	size: dsl(z.enum(['sm', 'md'])).optional(),
});

const SortStateSchema = z.object({
	key: z.string(),
	dir: z.enum(['asc', 'desc']),
});

export const SortableColumnNodeSchema = baseNode.extend({
	label: z.string(),
	sortKey: z.string(),
	currentSort: dsl(SortStateSchema).nullable(),
});
