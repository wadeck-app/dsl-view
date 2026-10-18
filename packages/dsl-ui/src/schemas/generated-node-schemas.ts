// src/schemas/generated-node-schemas.ts — GENERATED from XxxProps interfaces by scripts/generate-node-schemas.ts, do not edit
import { z } from 'zod';

const baseNode = z.object({ type: z.string() });

export const ButtonActionNodeSchema = baseNode.extend({
	label: z.string(),
	variant: z.enum(['primary', 'secondary', 'danger', 'danger-outline', 'success']).optional(),
	icon: z.array(z.unknown()).optional(),
	size: z.enum(['sm', 'md']).optional(),
	disabled: z.boolean().optional(),
	disabledReason: z.string().optional(),
	loading: z.boolean().optional(),
});

const CheckboxOptionSchema = z.object({
	value: z.string(),
	label: z.string(),
	disabled: z.boolean().optional(),
});

export const CheckboxGroupNodeSchema = baseNode.extend({
	options: z.array(CheckboxOptionSchema),
	value: z.array(z.string()),
	label: z.string().optional(),
	orientation: z.enum(['vertical', 'horizontal']).optional(),
});

export const ChipButtonNodeSchema = baseNode.extend({
	active: z.boolean(),
	color: z.unknown().optional(),
	items: z.array(z.unknown()).optional(),
	shape: z.enum(['pill', 'square']).optional(),
	emphasis: z.enum(['subtle', 'strong']).optional(),
	'aria-pressed': z.boolean().optional(),
	'aria-label': z.string().optional(),
	title: z.string().optional(),
	className: z.string().optional(),
});

const ColorOptionSchema = z.object({
	value: z.string(),
	label: z.string(),
});

export const ColorPickerNodeSchema = baseNode.extend({
	label: z.string(),
	options: z.array(ColorOptionSchema),
	value: z.string(),
});

export const CompactSelectNodeSchema = baseNode.extend({
	value: z.string(),
	options: z.array(z.unknown()),
	ariaLabel: z.string(),
	placeholder: z.string().optional(),
	disabled: z.boolean().optional(),
});

export const IconButtonNodeSchema = baseNode.extend({
	icon: z.array(z.unknown()).optional(),
	'aria-label': z.string(),
	size: z.enum(['icon', 'icon-field', 'icon-sm', 'icon-xs']).optional(),
});

export const InviteTokenWidgetNodeSchema = baseNode.extend({
	inviteToken: z.string().nullable().optional(),
	isPending: z.boolean().optional(),
});

export const LiveToggleNodeSchema = baseNode.extend({
	live: z.boolean(),
});

export const PageSizeSelectNodeSchema = baseNode.extend({
	urlParam: z.string().optional(),
	value: z.number().optional(),
	options: z.array(z.number()),
});

const RadioOptionSchema = z.object({
	value: z.string(),
	label: z.string(),
	disabled: z.boolean().optional(),
});

export const RadioGroupNodeSchema = baseNode.extend({
	options: z.array(RadioOptionSchema),
	value: z.string(),
	label: z.string().optional(),
	orientation: z.enum(['vertical', 'horizontal']).optional(),
});

export const RefreshButtonNodeSchema = baseNode.extend({
	loading: z.boolean().optional(),
});

export const SliderNodeSchema = baseNode.extend({
	value: z.number(),
	min: z.number().optional(),
	max: z.number().optional(),
	step: z.number().optional(),
	disabled: z.boolean().optional(),
	label: z.string().optional(),
	showValue: z.boolean().optional(),
});

export const SwitchNodeSchema = baseNode.extend({
	label: z.string().optional(),
	checked: z.boolean(),
	disabled: z.boolean().optional(),
	size: z.enum(['sm', 'md']).optional(),
});

export const TabButtonNodeSchema = baseNode.extend({
	active: z.boolean().optional(),
});

const ThemeOptionSchema = z.object({
	value: z.string(),
	label: z.string(),
	icon: z.string(),
});

export const ThemePickerNodeSchema = baseNode.extend({
	label: z.string(),
	options: z.array(ThemeOptionSchema),
	value: z.string(),
});

export const AvatarNodeSchema = baseNode.extend({
	src: z.string().optional(),
	alt: z.string().optional(),
	fallback: z.string().optional(),
	size: z.enum(['sm', 'md', 'lg']).optional(),
});

export const BadgeNodeSchema = baseNode.extend({
	label: z.string(),
	variant: z.enum(['default', 'primary', 'success', 'warning', 'danger', 'info']).optional(),
	tone: z.enum(['solid', 'subtle']).optional(),
	size: z.enum(['sm', 'md']).optional(),
});

const ChartSeriesConfigSchema = z.object({
	key: z.string(),
	name: z.string(),
	color: z.string().optional(),
	type: z.enum(['line', 'bar', 'area']).default('line'),
	yAxisId: z.enum(['left', 'right']).default('left'),
});

export const ChartNodeSchema = baseNode.extend({
	data: z.array(z.unknown()).optional(),
	xAxisKey: z.string(),
	xAxisType: z.enum(['time', 'category']),
	height: z.number().default(300),
	series: z.array(ChartSeriesConfigSchema),
});

export const FetchSpinnerNodeSchema = baseNode.extend({
	loading: z.boolean(),
});

export const HttpMethodBadgeNodeSchema = baseNode.extend({
	method: z.string(),
});

export const HttpStatusBadgeNodeSchema = baseNode.extend({
	status: z.number(),
});

export const InlineEditNodeSchema = baseNode.extend({
	value: z.string(),
	placeholder: z.string().optional(),
	disabled: z.boolean().optional(),
	multiline: z.boolean().optional(),
	className: z.string().optional(),
	editClassName: z.string().optional(),
});

export const JsonViewerNodeSchema = baseNode.extend({
	row: z.record(z.string(), z.unknown()).optional(),
	field: z.string().optional(),
	maxHeight: z.string().optional(),
});

export const PageHeaderNodeSchema = baseNode.extend({
	title: z.string(),
	subtitle: z.string().optional(),
	icon: z.unknown().optional(),
	headerActions: z.array(z.unknown()).optional(),
	size: z.enum(['default', 'sm']).optional(),
});

export const ProgressNodeSchema = baseNode.extend({
	value: z.number(),
	max: z.number().optional(),
	variant: z.enum(['default', 'success', 'danger']).optional(),
	label: z.string().optional(),
	showValue: z.boolean().optional(),
	size: z.enum(['sm', 'md']).optional(),
	layout: z.enum(['stacked', 'inline']).optional(),
	valueLabel: z.string().optional(),
});

export const RelativeDateNodeSchema = baseNode.extend({
	date: z.union([z.unknown(), z.string(), z.number()]),
	className: z.string().optional(),
	live: z.boolean().default(true),
	tooltip: z.boolean().default(true),
	format: z.string().optional(),
});

export const SkeletonNodeSchema = baseNode.extend({
	width: z.string().optional(),
	height: z.string().optional(),
	variant: z.enum(['line', 'circle', 'block']).optional(),
	count: z.number().optional(),
});

export const SpinnerNodeSchema = baseNode.extend({
	size: z.enum(['sm', 'md', 'lg']).optional(),
	label: z.string().optional(),
});

export const TagNodeSchema = baseNode.extend({
	label: z.string(),
	color: z.enum(['default', 'blue', 'green', 'red', 'yellow', 'purple']).optional(),
});

export const ButtonCancelNodeSchema = baseNode.extend({
	label: z.string().optional(),
	disabled: z.boolean().optional(),
});

export const ButtonSaveNodeSchema = baseNode.extend({
	label: z.string().optional(),
	isPending: z.boolean().optional(),
	hasChanges: z.boolean().optional(),
	disabledReason: z.string().optional(),
});

export const CronBuilderNodeSchema = baseNode.extend({
	value: z.string(),
});

export const DatePickerNodeSchema = baseNode.extend({
	value: z.unknown().nullable(),
	minDate: z.unknown().optional(),
	maxDate: z.unknown().optional(),
	placeholder: z.string().optional(),
	disabled: z.boolean().optional(),
	dateFormat: z.string().optional(),
});

const DateRangeSchema = z.object({
	from: z.unknown().nullable(),
	to: z.unknown().nullable(),
});

export const DateRangePickerNodeSchema = baseNode.extend({
	value: DateRangeSchema,
	disabled: z.boolean().optional(),
	minDate: z.unknown().optional(),
	maxDate: z.unknown().optional(),
	placeholder: z.string().optional(),
	dateFormat: z.string().optional(),
	open: z.boolean().optional(),
});

const FieldAsyncSelectOptionSchema = z.object({
	label: z.string(),
	value: z.string(),
});

export const FieldAsyncSelectNodeSchema = baseNode.extend({
	name: z.string().optional(),
	label: z.string(),
	description: z.string().optional(),
	required: z.boolean().optional(),
	error: z.string().optional(),
	disabled: z.boolean().optional(),
	value: z.string().nullable(),
	placeholder: z.string().optional(),
	debounceMs: z.number().optional(),
	noOptionsMessage: z.string().optional(),
});

const FieldAutocompleteOptionSchema = z.object({
	value: z.string(),
	label: z.string(),
});

export const FieldAutocompleteNodeSchema = baseNode.extend({
	label: z.string(),
	description: z.string().optional(),
	options: z.array(FieldAutocompleteOptionSchema),
	value: z.string(),
	placeholder: z.string().optional(),
	disabled: z.boolean().optional(),
});

export const FieldDateNodeSchema = baseNode.extend({
	label: z.string(),
	description: z.string().optional(),
	value: z.unknown().nullable(),
	minDate: z.unknown().optional(),
	maxDate: z.unknown().optional(),
	placeholder: z.string().optional(),
	disabled: z.boolean().optional(),
	dateFormat: z.string().optional(),
	required: z.boolean().optional(),
	error: z.string().optional(),
});

export const FieldDateRangeNodeSchema = baseNode.extend({
	label: z.string(),
	description: z.string().optional(),
	value: z.unknown(),
	minDate: z.unknown().optional(),
	maxDate: z.unknown().optional(),
	placeholder: z.string().optional(),
	disabled: z.boolean().optional(),
	dateFormat: z.string().optional(),
	required: z.boolean().optional(),
	error: z.string().optional(),
});

export const FieldDateTimeNodeSchema = baseNode.extend({
	label: z.string(),
	description: z.string().optional(),
	value: z.unknown().nullable(),
	minDate: z.unknown().optional(),
	maxDate: z.unknown().optional(),
	datePlaceholder: z.string().optional(),
	timePlaceholder: z.string().optional(),
	disabled: z.boolean().optional(),
	dateFormat: z.string().optional(),
	is12Hour: z.boolean().optional(),
	minuteStep: z.number().optional(),
	required: z.boolean().optional(),
	error: z.string().optional(),
	open: z.boolean().optional(),
});

const FieldMultiSelectOptionSchema = z.object({
	value: z.string(),
	label: z.string(),
});

export const FieldMultiSelectNodeSchema = baseNode.extend({
	name: z.string().optional(),
	label: z.string(),
	description: z.string().optional(),
	required: z.boolean().optional(),
	error: z.string().optional(),
	disabled: z.boolean().optional(),
	value: z.array(z.string()),
	options: z.array(FieldMultiSelectOptionSchema),
	placeholder: z.string().optional(),
	maxSelected: z.number().optional(),
});

export const FieldNumberNodeSchema = baseNode.extend({
	label: z.string(),
	description: z.string().optional(),
	value: z.union([z.string(), z.number()]),
	min: z.number().optional(),
	max: z.number().optional(),
	suffix: z.string().optional(),
	disabled: z.boolean().optional(),
	required: z.boolean().optional(),
	error: z.string().optional(),
	unlimited: z.string().optional(),
	unlimitedValue: z.boolean().optional(),
});

export const FieldReadOnlyNodeSchema = baseNode.extend({
	label: z.string(),
	description: z.string().optional(),
	value: z.string(),
	mono: z.boolean().optional(),
	copyable: z.boolean().optional(),
});

const FieldSelectOptionSchema = z.object({
	value: z.string(),
	label: z.string(),
});

export const FieldSelectNodeSchema = baseNode.extend({
	label: z.string(),
	description: z.string().optional(),
	value: z.string(),
	options: z.array(FieldSelectOptionSchema),
	placeholder: z.string().optional(),
	required: z.boolean().optional(),
	error: z.string().optional(),
});

export const FieldTagsNodeSchema = baseNode.extend({
	name: z.string().optional(),
	label: z.string(),
	description: z.string().optional(),
	required: z.boolean().optional(),
	error: z.string().optional(),
	disabled: z.boolean().optional(),
	value: z.array(z.string()),
	placeholder: z.string().optional(),
	maxTags: z.number().optional(),
	allowDuplicates: z.boolean().default(false),
});

export const FieldTextNodeSchema = baseNode.extend({
	label: z.string(),
	description: z.string().optional(),
	value: z.string(),
	readOnly: z.boolean().optional(),
	required: z.boolean().optional(),
	error: z.string().optional(),
});

export const FieldTextareaNodeSchema = baseNode.extend({
	label: z.string(),
	description: z.string().optional(),
	value: z.string(),
	rows: z.number().optional(),
});

export const FieldTimeNodeSchema = baseNode.extend({
	label: z.string(),
	description: z.string().optional(),
	value: z.string().nullable(),
	is12Hour: z.boolean().optional(),
	minuteStep: z.number().optional(),
	placeholder: z.string().optional(),
	disabled: z.boolean().optional(),
	required: z.boolean().optional(),
	error: z.string().optional(),
});

export const FieldWrapperNodeSchema = baseNode.extend({
	label: z.string(),
	description: z.string().optional(),
	required: z.boolean().optional(),
	error: z.string().optional(),
	children: z.union([z.array(z.unknown()).optional()]),
});

export const FormNodeSchema = baseNode.extend({
	fields: z.array(z.unknown()).optional(),
	actions: z.array(z.unknown()).optional(),
	initialData: z.record(z.string(), z.unknown()).optional(),
});

export const TimePickerNodeSchema = baseNode.extend({
	value: z.string().nullable(),
	is12Hour: z.boolean().optional(),
	minuteStep: z.number().optional(),
	disabled: z.boolean().optional(),
	placeholder: z.string().optional(),
	open: z.boolean().optional(),
});

export const UnsavedBadgeNodeSchema = baseNode.extend({
	hasChanges: z.boolean().optional(),
});

export const ActionBarNodeSchema = baseNode.extend({
	items: z.array(z.unknown()).optional(),
	className: z.string().optional(),
});

export const CardNodeSchema = baseNode.extend({
	items: z.array(z.unknown()).optional(),
	className: z.string().optional(),
	padding: z.enum(['none', 'sm', 'md', 'lg']).optional(),
	shadow: z.boolean().optional(),
	border: z.boolean().optional(),
	header: z.array(z.unknown()).optional(),
	footer: z.array(z.unknown()).optional(),
});

export const CardActionsNodeSchema = baseNode.extend({
	items: z.array(z.unknown()).optional(),
	className: z.string().optional(),
});

export const CollapsibleNodeSchema = baseNode.extend({
	title: z.string(),
	defaultOpen: z.boolean().optional(),
	items: z.array(z.unknown()).optional(),
});

export const DialogFooterNodeSchema = baseNode.extend({
	items: z.array(z.unknown()).optional(),
	className: z.string().optional(),
});

export const DividerNodeSchema = baseNode.extend({
	orientation: z.enum(['horizontal', 'vertical']).optional(),
	label: z.string().optional(),
	className: z.string().optional(),
});

export const HorizontalStackNodeSchema = baseNode.extend({
	gap: z.enum(['gap-0', 'gap-0.5', 'gap-1', 'gap-1.5', 'gap-2', 'gap-2.5', 'gap-3', 'gap-4', 'gap-5', 'gap-6', 'gap-7', 'gap-8', 'gap-9', 'gap-10', 'gap-12', 'gap-16']).optional(),
	align: z.enum(['items-start', 'items-center', 'items-end', 'items-stretch', 'items-baseline']).optional(),
	justify: z.enum(['justify-start', 'justify-center', 'justify-end', 'justify-between', 'justify-around', 'justify-evenly']).optional(),
	items: z.array(z.unknown()).optional(),
	itemSizes: z.array(z.enum(['fixed', 'flex']).optional()).optional(),
});

export const NavBarNodeSchema = baseNode.extend({
	items: z.array(z.unknown()).optional(),
	className: z.string().optional(),
});

export const PageContentNodeSchema = baseNode.extend({
	sections: z.array(z.unknown()).optional(),
	maxWidth: z.enum(['sm', 'md', 'lg', 'xl', '2xl', 'full']).default('xl'),
});

export const PageSectionNodeSchema = baseNode.extend({
	title: z.string(),
	actions: z.array(z.unknown()).optional(),
	items: z.array(z.unknown()).optional(),
	className: z.string().optional(),
});

export const ScrollAreaNodeSchema = baseNode.extend({
	items: z.array(z.unknown()).optional(),
	scheme: z.enum(['auto', 'dark', 'light']).optional(),
	axis: z.enum(['vertical', 'horizontal', 'both']).optional(),
	className: z.string().optional(),
});

export const SectionNodeSchema = baseNode.extend({
	title: z.string().optional(),
	items: z.array(z.unknown()).optional(),
});

const StatTileTrendSchema = z.object({
	value: z.number(),
	direction: z.enum(['up', 'down', 'neutral']),
	label: z.string().optional(),
});

export const StatTileNodeSchema = baseNode.extend({
	label: z.string(),
	value: z.union([z.string(), z.number()]),
	trend: StatTileTrendSchema.optional(),
	icon: z.array(z.unknown()).optional(),
	loading: z.boolean().optional(),
	className: z.string().optional(),
});

export const TableRowActionsNodeSchema = baseNode.extend({
	items: z.array(z.unknown()).optional(),
	className: z.string().optional(),
});

export const ThemeScopeNodeSchema = baseNode.extend({
	theme: z.enum(['light', 'dark']),
	surface: z.enum(['page', 'panel', 'none']).optional(),
	tokens: z.record(z.string(), z.string()).optional(),
	className: z.string().optional(),
	items: z.array(z.unknown()).optional(),
});

export const VerticalStackNodeSchema = baseNode.extend({
	gap: z.enum(['gap-0', 'gap-0.5', 'gap-1', 'gap-1.5', 'gap-2', 'gap-2.5', 'gap-3', 'gap-4', 'gap-5', 'gap-6', 'gap-7', 'gap-8', 'gap-9', 'gap-10', 'gap-12', 'gap-16']).optional(),
	items: z.array(z.unknown()).optional(),
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
	icon: z.array(z.unknown()).optional(),
	variant: z.enum(['primary', 'secondary', 'danger', 'danger-outline', 'neutral', 'success']).optional(),
	size: z.enum(['sm', 'md']).optional(),
});

export const LinkNodeSchema = baseNode.extend({
	href: z.string(),
	label: z.string(),
	external: z.boolean().optional(),
	variant: z.enum(['default', 'muted', 'danger']).optional(),
});

const PageTabDefSchema = z.object({
	id: z.string(),
	label: z.string(),
	children: z.array(z.unknown()).optional(),
});

export const PageTabsNodeSchema = baseNode.extend({
	tabs: z.array(PageTabDefSchema),
	activeTab: z.string(),
});

const StepperStepSchema = z.object({
	label: z.string(),
	description: z.string().optional(),
	items: z.array(z.unknown()).optional(),
});

export const StepperNodeSchema = baseNode.extend({
	steps: z.array(StepperStepSchema),
	completedLabel: z.string().optional(),
	className: z.string().optional(),
});

const TabDefSchema = z.object({
	key: z.string(),
	label: z.string(),
	children: z.array(z.unknown()).optional(),
});

export const TabsNodeSchema = baseNode.extend({
	tabs: z.array(TabDefSchema),
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
	nodes: z.array(TreeNodeSchema),
	selectedId: z.string().optional(),
	defaultExpandedIds: z.array(z.string()).optional(),
	expandedIds: z.array(z.string()).optional(),
	className: z.string().optional(),
});

export const ConfirmDialogNodeSchema = baseNode.extend({
	open: z.boolean(),
	title: z.string(),
	message: z.array(z.unknown()).optional(),
	confirmLabel: z.string().optional(),
	confirmVariant: z.enum(['danger', 'primary']).optional(),
});

const ContextMenuItemSchema = z.object({
	label: z.string(),
	icon: z.array(z.unknown()).optional(),
	disabled: z.boolean().optional(),
	danger: z.boolean().optional(),
	separator: z.boolean().optional(),
});

export const ContextMenuNodeSchema = baseNode.extend({
	trigger: z.array(z.unknown()).optional(),
	items: z.array(ContextMenuItemSchema),
	side: z.enum(['top', 'right', 'bottom', 'left']).optional(),
	align: z.enum(['start', 'center', 'end']).optional(),
	open: z.boolean().optional(),
});

export const DialogNodeSchema = baseNode.extend({
	title: z.string(),
	trigger: z.array(z.unknown()).optional(),
	open: z.boolean().optional(),
	items: z.array(z.unknown()).optional(),
	actions: z.array(z.unknown()).optional(),
	size: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
});

export const DialogFormNodeSchema = baseNode.extend({
	title: z.string(),
	visible: z.unknown(),
	initialData: z.record(z.string(), z.unknown()).nullable().optional(),
	fields: z.array(z.unknown()).optional(),
	size: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
});

export const DrawerNodeSchema = baseNode.extend({
	open: z.boolean(),
	side: z.enum(['left', 'right', 'bottom']).optional(),
	title: z.string().optional(),
	footer: z.array(z.unknown()).optional(),
	items: z.array(z.unknown()).optional(),
	size: z.enum(['sm', 'md', 'lg']).optional(),
	hideCloseButton: z.boolean().optional(),
});

export const PopoverNodeSchema = baseNode.extend({
	trigger: z.array(z.unknown()).optional(),
	items: z.array(z.unknown()).optional(),
	side: z.enum(['top', 'right', 'bottom', 'left']).optional(),
	align: z.enum(['start', 'center', 'end']).optional(),
	open: z.boolean().optional(),
	className: z.string().optional(),
});

export const ToastProviderNodeSchema = baseNode.extend({
	items: z.array(z.unknown()).optional(),
});

export const TooltipNodeSchema = baseNode.extend({
	content: z.string(),
	items: z.array(z.unknown()).optional(),
});

export const BulkActionsToolbarNodeSchema = baseNode.extend({
	selectedCount: z.number(),
	items: z.array(z.unknown()).optional(),
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
	format: z.enum(['datetime', 'date', 'time', 'bytes', 'ms', 'httpMethod', 'httpStatus']).optional(),
	width: z.number().optional(),
	truncate: z.boolean().optional(),
	sortable: z.boolean().optional(),
	isActions: z.boolean().optional(),
	actions: z.array(ActionDefSchema).optional(),
});

export const DataTableNodeSchema = baseNode.extend({
	rows: z.array(z.unknown()),
	columns: z.array(TableColumnSchema),
	loading: z.boolean().optional(),
	emptyMessage: z.string().optional(),
	navigateTo: z.string().optional(),
	filtersTop: z.array(z.unknown()).optional(),
	filters: z.array(z.unknown()).optional(),
	id: z.string().optional(),
	page: z.number().optional(),
	sortCol: z.string().optional(),
	sortDir: z.enum(['asc', 'desc']).optional(),
	defaultFilters: z.record(z.string(), z.unknown()).optional(),
	expansion: z.record(z.string(), z.unknown()).optional(),
	selectable: z.boolean().optional(),
	batchActions: z.array(z.object({
		label: z.string(),
		action: z.string(),
		variant: z.enum(['primary', 'danger', 'ghost', 'success']).optional(),
	})).optional(),
	batchActionsPosition: z.enum(['floating', 'bottom']).optional(),
	expansionCondition: z.string().optional(),
	fontMono: z.boolean().optional(),
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
	filters: z.array(FilterBarFilterSchema).optional(),
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
	options: z.array(FilterChipOptionSchema),
	value: z.array(z.string()),
	mode: z.enum(['multi', 'single']).optional(),
});

export const PaginationNodeSchema = baseNode.extend({
	urlParam: z.string().optional(),
	page: z.number().optional(),
	total: z.number(),
	size: z.number(),
});

export const SearchBarNodeSchema = baseNode.extend({
	value: z.string(),
	placeholder: z.string().optional(),
	debounceMs: z.number().optional(),
	focusExpand: z.boolean().optional(),
	size: z.enum(['sm', 'md']).optional(),
});

export const ShownFetchedCounterNodeSchema = baseNode.extend({
	raw: z.union([z.record(z.string(), z.unknown()), z.array(z.unknown())]).nullable().optional(),
	entriesField: z.string().optional(),
	totalField: z.string().optional(),
	pushRight: z.boolean().optional(),
});

const SortStateSchema = z.object({
	key: z.string(),
	dir: z.enum(['asc', 'desc']),
});

export const SortableColumnNodeSchema = baseNode.extend({
	label: z.string(),
	sortKey: z.string(),
	currentSort: SortStateSchema.nullable(),
});

export const StatusFilterNodeSchema = baseNode.extend({
	field: z.string().optional(),
	value: z.string(),
	options: z.array(z.union([z.string(), z.object({
		value: z.string(),
		label: z.string(),
	})])).optional(),
});
