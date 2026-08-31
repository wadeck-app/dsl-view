// src/schemas/generated-node-schemas.ts — GENERATED from XxxProps interfaces by scripts/generate-node-schemas.ts, do not edit
import { z } from 'zod';

const baseNode = z.object({ type: z.string() });
export const ButtonActionNodeSchema = baseNode.extend({
	label: z.string(),
	variant: z.enum(['primary', 'danger', 'danger-outline', 'success']).optional(),
});

export const ChipButtonNodeSchema = baseNode.extend({
	active: z.boolean(),
	color: z.unknown().optional(),
	children: z.array(z.unknown()).optional(),
	shape: z.enum(['pill', 'square']).optional(),
	'aria-pressed': z.boolean().optional(),
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

export const InviteTokenWidgetNodeSchema = baseNode.extend({
	inviteToken: z.string().nullable().optional(),
	isPending: z.boolean().optional(),
});

export const LiveToggleNodeSchema = baseNode.extend({
	live: z.boolean(),
});

export const PageSizeSelectNodeSchema = baseNode.extend({
	value: z.number(),
	options: z.array(z.number()),
});

export const RefreshButtonNodeSchema = baseNode.extend({
	loading: z.boolean().optional(),
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

export const JsonViewerNodeSchema = baseNode.extend({
	row: z.record(z.string(), z.unknown()).optional(),
	field: z.string().optional(),
});

export const PageHeaderNodeSchema = baseNode.extend({
	title: z.string(),
	subtitle: z.string().optional(),
	icon: z.unknown().optional(),
	headerActions: z.array(z.unknown()).optional(),
	size: z.enum(['default', 'sm']).optional(),
});

export const ButtonCancelNodeSchema = baseNode.extend({
	label: z.string().optional(),
});

export const ButtonSaveNodeSchema = baseNode.extend({
	label: z.string().optional(),
	isPending: z.boolean().optional(),
	hasChanges: z.boolean().optional(),
	disabledReason: z.string().optional(),
});

export const FieldNumberNodeSchema = baseNode.extend({
	label: z.string(),
	description: z.string().optional(),
	value: z.union([z.string(), z.number()]),
	min: z.number().optional(),
	max: z.number().optional(),
	suffix: z.string().optional(),
	disabled: z.boolean().optional(),
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
});

export const FieldTextNodeSchema = baseNode.extend({
	label: z.string(),
	description: z.string().optional(),
	value: z.string(),
	readOnly: z.boolean().optional(),
});

export const FieldTextareaNodeSchema = baseNode.extend({
	label: z.string(),
	description: z.string().optional(),
	value: z.string(),
	rows: z.number().optional(),
});

export const FieldWrapperNodeSchema = baseNode.extend({
	label: z.string(),
	description: z.string().optional(),
	children: z.array(z.unknown()).optional(),
});

export const FormNodeSchema = baseNode.extend({
	fields: z.array(z.unknown()).optional(),
	actions: z.array(z.unknown()).optional(),
	initialData: z.record(z.string(), z.unknown()).optional(),
});

export const UnsavedBadgeNodeSchema = baseNode.extend({
	hasChanges: z.boolean().optional(),
});

export const ActionBarNodeSchema = baseNode.extend({
	children: z.array(z.unknown()).optional(),
});

export const HorizontalStackNodeSchema = baseNode.extend({
	gap: z.unknown().optional(),
	align: z.unknown().optional(),
	justify: z.unknown().optional(),
	children: z.array(z.unknown()).optional(),
	itemSizes: z.array(z.unknown().optional()).optional(),
});

export const PageContentNodeSchema = baseNode.extend({
	sections: z.array(z.unknown()).optional(),
	maxWidth: z.unknown().default('xl'),
});

export const SectionNodeSchema = baseNode.extend({
	title: z.string().optional(),
	children: z.array(z.unknown()).optional(),
});

export const VerticalStackNodeSchema = baseNode.extend({
	gap: z.unknown().optional(),
	children: z.array(z.unknown()).optional(),
});

export const BreadcrumbNodeSchema = baseNode.extend({
	currentPath: z.string(),
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

export const ConfirmDialogNodeSchema = baseNode.extend({
	open: z.boolean(),
	title: z.string(),
	message: z.array(z.unknown()).optional(),
	confirmLabel: z.string().optional(),
	confirmVariant: z.enum(['danger', 'primary']).optional(),
});

export const DialogNodeSchema = baseNode.extend({
	title: z.string(),
	trigger: z.array(z.unknown()).optional(),
	open: z.boolean().optional(),
	children: z.array(z.unknown()).optional(),
	actions: z.array(z.unknown()).optional(),
	size: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
});

export const ToastProviderNodeSchema = baseNode.extend({
	children: z.array(z.unknown()).optional(),
});

export const TooltipNodeSchema = baseNode.extend({
	content: z.string(),
	children: z.array(z.unknown()).optional(),
});

const ActionDefSchema = z.object({
	label: z.string(),
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
	sortDir: z.string().optional(),
	defaultFilters: z.record(z.string(), z.unknown()).optional(),
	expansion: z.unknown().optional(),
	selectable: z.boolean().optional(),
	batchActions: z.array(z.object({
		label: z.string(),
		action: z.string(),
		variant: z.enum(['primary', 'danger', 'ghost', 'success']).optional(),
	})).optional(),
	expansionCondition: z.string().optional(),
	fontMono: z.boolean().optional(),
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
});

export const PaginationNodeSchema = baseNode.extend({
	page: z.number(),
	total: z.number(),
	size: z.number(),
});

export const SearchBarNodeSchema = baseNode.extend({
	value: z.string(),
	placeholder: z.string().optional(),
	debounceMs: z.number().optional(),
	focusExpand: z.boolean().optional(),
});

export const ShownFetchedCounterNodeSchema = baseNode.extend({
	raw: z.union([z.record(z.string(), z.unknown()), z.array(z.unknown())]).nullable().optional(),
	entriesField: z.string().optional(),
	totalField: z.string().optional(),
	pushRight: z.boolean().optional(),
});

export const StatusFilterNodeSchema = baseNode.extend({
	field: z.string().optional(),
	value: z.string(),
	options: z.array(z.union([z.string(), z.object({
		value: z.string(),
		label: z.string(),
	})])).optional(),
});
