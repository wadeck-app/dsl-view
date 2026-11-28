# Component inventory

Every component `@wadeck-app/dsl-ui` declares for the registry, plus its React-only APIs. Read this to pick a component before hand-rolling one; props and behaviour live in the source and in `dsl-renderer-consumer-reference.md`.

- **Component** is the registry name, i.e. the `$type` in a DSL node.
- **Category** is the component's `@registryCategory` value.
- **Key props** are the most important ones, not the full list. Open the component's `Props` interface for the rest.

Maintenance: add a row here in the same change that adds, renames or removes a component. The `dsl-ui/component-in-inventory` violation fails when an annotated component is not named in backticks below.

## Registry components

### controls

| Component | Category | Key props | What it is / when to use |
|---|---|---|---|
| `ActionButton` | atomic | action, label, params, body, icon, iconOnly, variant, size, ariaLabel, loadingStyle | Button that runs a named `$actions` entry from anywhere on a page; use instead of ButtonAction when the page runner should dispatch the request and track pending state. |
| `ButtonAction` | atomic | label, ariaLabel, variant (incl. quiet ghost and link), icon, size (xs 22px, sm, md), onClick, loading, ariaExpanded, ariaControls, underline (link variant: always), autoFocus (takes the initial focus of a Dialog), disabled, type, form | Plain labelled button with explicit onClick, loading and optional icon node; `type: submit` with `form: <form id>` submits a form the button is not inside of (a Dialog footer); use when you wire the handler yourself rather than running a `$actions` entry. |
| `Checkbox` | atomic | label, checked, onChange, disabled, className | Single native checkbox input with an optional text label that makes the whole row clickable; use for one boolean, CheckboxGroup for several. |
| `CheckboxGroup` | atomic | options, value, onChange, label, orientation | Fieldset of checkboxes bound to a string array, with optional legend and vertical or horizontal layout; use for multi-select from a few options. |
| `ChipButton` | disposition | active, onClick, children, color, shape, emphasis, disabled, disabledReason | Toggle chip button with pill or square shape and palette colours, showing an active state; use for filter toggles or picking items in a grid. |
| `ColorPicker` | atomic | label, options, value, onChange | Row of round colour swatch buttons (blue, violet, orange, green, rose, teal) with a label; use to pick one named accent colour. |
| `CompactSelect` | atomic | ariaLabel, options, value, onChange, urlParam, defaultValue, storageKey, resetUrlParams, placeholder, size, tooltip | Label-less native select sized for toolbars (`size="sm"` is the 22px toolbar height shared with `SearchBar size="sm"`, `ChipButton` and `RefreshButton`, and the one to put inside a chip), optionally backed by a URL param (`defaultValue` is shown while the param is absent; `storageKey` remembers the choice in localStorage and restores it to the URL, one extra refetch; with `urlParam`, a value no option carries shows as a disabled `Unknown: <value>`); use instead of FieldSelect in a row of controls, or PageSizeSelect for non-page-size choices. |
| `DeleteButton` | atomic | children, onClick, disabled, disabledReason, loading | Small danger-styled button labelled 'Delete' by default, with variant and size fixed; use for a destructive action instead of configuring a Button. |
| `IconButton` | atomic | icon, aria-label, tooltip (a longer text, or `false` for no card), size, variant, onClick | Icon-only ghost button that requires an aria-label, shown as a Tooltip on hover and keyboard focus (no native title); use for compact toolbar actions without visible text. |
| `LiveToggle` | atomic | live, onChange, urlParam | Pause/play toggle button showing 'live' or 'paused', controlled or backed by a URL param for `pollWhen`; use to switch automatic refresh on or off. |
| `PageSizeSelect` | atomic | options, urlParam, value, onChange, default, resetUrlParams | Select of page sizes shown as 'N / page', optionally backed by a URL param with a default; use for pagination page size, CompactSelect for other choices. |
| `Radio` | atomic | name, value, checked, onChange, disabled | Single native radio input with themed styling and no label or group logic; use RadioGroup when you need options and a bound value. |
| `RadioGroup` | atomic | options, value, onChange, label, orientation | Fieldset of Radix radio items with labels bound to one string value, vertical or horizontal; use for choosing exactly one of a few visible options. |
| `RefreshButton` | atomic | source, label, onRefresh, onClick, loading, disabled, disabledReason | Small 'Refresh' button that re-fetches one named source or all page sources via the page's `$refresh`, with a spinning icon while running. |
| `Slider` | atomic | value, onChange, min, max, step, label, showValue | Radix single-thumb slider for a number with min, max and step, optional label and displayed value; use to pick a number in a range. |
| `Switch` | atomic | checked, onChange, label, size, disabled | Radix on/off switch with optional label and sm or md size; use for an immediately-applied boolean setting, Checkbox for form-style booleans. |
| `TabButton` | atomic | active, children, onClick, variant, className | Ghost button that draws an underline and aria-current when active; use for hand-built tab strips. |
| `ThemePicker` | composite | label, options, value, onChange | Labelled group of icon-and-text buttons (Sun, Moon) choosing the theme, which also updates the global ThemeContext when present. |

### dev

| Component | Category | Key props | What it is / when to use |
|---|---|---|---|
| `AbTest` | disposition | id, label, initial, variants | Dev-time A/B node that renders the chosen variant's view and registers a dock row; shows the `initial` variant when experiments are off. |

### display

| Component | Category | Key props | What it is / when to use |
|---|---|---|---|
| `Avatar` | atomic | src, alt, fallback, size | Round user image with a text fallback (given, or first two characters of alt, or '?') in sm, md or lg size. |
| `Notice` | atomic | label, variant, showMoreLabel, showLessLabel | Short message that wraps (status role, alert for danger), same `label`/`variant` as Badge; a long message is clamped to three lines behind Show more; pick it for the feedback of an action in a narrow column where Badge would overflow. |
| `Badge` | atomic | label, variant, tone, size, href, external, onRemove, removeLabel, title | Rounded status pill with variant colours, solid or subtle tone, optionally a link or removable (`onRemove: $action`: inset ring in its variant colour so the height stays that of other badges, a cross that becomes a solid disc on hover); `title` is the tooltip of the whole badge; use for a status value, Tag for free-form labels. |
| `Chart` | composite | data, xAxisKey, xAxisType, series, xFormat, yFormat, variant | Recharts line, bar and area chart from source rows with time or category x axis, dual y axes and sparkline variant; shows skeleton while data is undefined. |
| `DateText` | atomic | value, dateStyle, part, relative | Plain text date or time formatted per the date settings with exact instant as tooltip; use for a static value, RelativeDate for a live 'ago' label. |
| `FetchSpinner` | atomic | loading | Small spinning loader icon shown only while `loading` is true and rendering nothing otherwise; use inline next to content being fetched, Spinner for a standalone one. |
| `FigureRow` | composite | items (label, value, unit, href, external, trend, pointsLabel) | Row of figures sharing the full width, each `value unit` on one line, with an optional trend arrow, a sparkline whose points can be inspected, and a drill-down link; pick it over a row of StatTile when a unit must stay beside the value, or for a trend over recent points. |
| `JsonViewer` | atomic | row, field, maxHeight | Monospace preformatted block showing a row field as pretty-printed JSON (raw text if not valid JSON), with optional max height scroll. |
| `Markdown` | atomic | text, maxHeight, collapsed, allowImages | Safe markdown renderer (raw HTML as text, http/https/mailto links only, images off by default) with GFM tables, optional collapsed preview and max height. |
| `PageHeader` | composite | title, subtitle, icon, headerActions, size, placement | Page or section heading (h1, or h2 for size sm) with optional subtitle, icon or right-side header actions; not every layout renders all props. `placement: trail` moves the whole header into the host's `HeaderActionsSlot` as one row (in place when no slot is mounted). |
| `HeaderActions` | composite | children (with `HeaderActionsProvider` and `HeaderActionsSlot`, className; `useHeaderActionsFilled()` / slot `data-filled` say whether the slot holds content) | Page-header actions slot, React only: the host wraps the shell in `HeaderActionsProvider` and puts `HeaderActionsSlot` in the title row (it owns placement and `sticky`); a page or module renders `<HeaderActions>` with its chips or buttons and they appear there, no measuring or fixed offsets; nothing shown, and reported once, without a slot. |
| `Progress` | atomic | value, max, variant, label, showValue, layout, valueLabel | Radix progress bar (`valueLabel` is also the aria-valuetext) with variant colours, optional label and value text, stacked or inline layout; use for a known fraction, Spinner when unknown. |
| `RelativeDate` | atomic | date, live, tooltip, className | Text like '5 minutes ago' that updates every 60s by default, with exact timestamp tooltip; use instead of DateText for a live relative label. |
| `Skeleton` | atomic | width, height, variant, count, decorative | Pulsing placeholder bar (line, circle or block), optionally repeated count times, for content that is still loading. |
| `SparklineView` | atomic | points, ariaLabel | Tiny line chart of recent points with gaps and a tooltip that follows the pointer, touch or arrow keys (focusable slider); pick it for an inline trend, Chart `variant: sparkline` for a full-size plot. Do not nest it in a link or button. |
| `Spinner` | atomic | size, label | Standalone spinning SVG loader in sm, md or lg size with optional visible label; use FetchSpinner for a small inline indicator. |
| `Text` | atomic | text, tone, size, mono | Inline run of text: muted/danger/success tone, xs/sm size, monospace for ids, hashes and paths. Adds no block or padding; use it inside a sentence or next to other atoms instead of a hand-rolled span. |
| `Tag` | atomic | label, color, onRemove | Small rounded label with a colour palette and optional remove button; use for free-form labels, Badge for statuses. |
| `TimeBrush` | composite | data, valueKey, kind, syncGroup, domain, initialWindow, yAxisWidth, marginRight | Overview strip with zoom, pan and reset buttons for the `TimeSeriesChart`s of one `syncGroup`; drag the window to pan, drag an edge to resize, click to recentre. Give it the charts' `yAxisWidth` and `marginRight` so it lines up with their plots. |
| `TimeSeriesChart` | composite | data, xKey, series, xFormat, syncGroup, initialWindow, gapDashAfterDays, bands, rangeAreas, yFormat, height | Timestamp (ms) x axis with lines, areas, plain or floating bars, a second y axis, zone bands, dashed bridges over gaps, per-point colours, and a pan / zoom window (drag, Ctrl + wheel, keys) shared with the charts and brush of its `syncGroup`; stacked charts align to the pixel. Use `Chart` for category axes, sparklines, byte values or a quick single chart. |

### form

| Component | Category | Key props | What it is / when to use |
|---|---|---|---|
| `ButtonCancel` | atomic | onCancel, label, disabled, disabledReason | Cancel button for a form's action row; calls onCancel when clicked. |
| `ButtonSubmit` | atomic | label, variant, pendingLabel, requireChanges, loadingStyle | Submit button that follows the form: off with the first error as its reason while an error blocks the form, `pendingLabel` while the save runs, on with the warning count; enabled with nothing modified unless `requireChanges` (a confirm-delete form has no field). Pick it over `ButtonSave` when the form is not a plain "save my edits". |
| `FormMessages` | atomic | className | Lists the messages of the form it sits in, errors first (errors as alerts, warnings and infos as status); put it in the form's `fields`. |
| `ButtonSave` | atomic | label, onClick, isPending, hasChanges, disabledReason, loadingStyle | Primary save button; inside a Form it submits and takes pending/unsaved state from the form, outside it uses onClick. `loadingStyle` (sweep, dots, bar, pulse, orbit) shows the wait without changing the button size or label; the default keeps "Saving...". |
| `CronBuilder` | composite | value, onChange, onClose | Frequency wizard that edits a cron expression and has a cancel button; use for schedule values instead of a free text field. |
| `DatePicker` | atomic | value, onChange, onSelect, minDate, maxDate, isDateDisabled, dateFormat | Bare date input with calendar popup and no label or error wrapper; use FieldDate for the labelled form field. |
| `DateRangePicker` | atomic | value, onChange, minDate, maxDate, isDisabled, dateFormat, placeholder | Bare date-range input with calendar and no label wrapper; use FieldDateRange for the labelled form field. |
| `FieldAsyncSelect` | atomic | label, value, onChange, loadOptions, loadSelected, debounceMs, noOptionsMessage | Single-select field whose options are fetched by a debounced search query; pick it over FieldSelect when options are loaded remotely. |
| `FieldAutocomplete` | atomic | label, value, onChange, options, placeholder, description, disabled | Text input with a filtered suggestion list; the value stays free text, unlike FieldSelect. |
| `FieldDate` | atomic | label, value, onChange, minDate, maxDate, dateFormat, required, error | Labelled form field wrapping DatePicker for choosing a single date. |
| `FieldDateRange` | atomic | label, value, onChange, minDate, maxDate, dateFormat, required, error | Labelled form field wrapping DateRangePicker for choosing a start and end date. |
| `FieldDateTime` | atomic | label, value, onChange, minDate, maxDate, is12Hour, minuteStep, required | Labelled form field combining DatePicker and TimePicker to choose one moment as a date and a time. |
| `FieldMultiSelect` | atomic | label, value, onChange, options, maxSelected, placeholder, required | Labelled multi-select field choosing several values from a fixed options list, with an optional maximum. |
| `FieldNumber` | atomic | label, value, onChange, min, max, suffix, unlimited | Labelled number input with optional min, max and suffix, and an optional linked 'unlimited' checkbox. |
| `FieldReadOnly` | atomic | label, value, mono, copyable, description | Labelled non-editable value display, optionally monospace and copyable; use instead of FieldText for values the user cannot edit. |
| `FieldSelect` | atomic | label, value, onChange, options, placeholder, required, error, hideLabel, size (md 38px, sm 26px) | Labelled single-select field choosing one value from a fixed options list. |
| `FieldTags` | atomic | label, value, onChange, maxTags, allowDuplicates, placeholder, required | Labelled tag input that builds a list of strings, with optional maximum and duplicate control. |
| `FieldText` | atomic | label, value, onChange, description, required, error, readOnly, hideLabel, size (md 38px, sm 26px), icon (leading, React) | Labelled single-line text input accepting standard HTML input attributes (a caller `id` and `aria-*` are kept); the default text field. |
| `FieldSecret` | atomic | label, description, required, error, disabled, placeholder, onEnter, name, id, autoComplete, showLabel, hideLabel | Uncontrolled password field for a passphrase or token: no `value`/`onChange`, the text lives only in the input; the owner keeps a ref and calls `read()` on submit then `clear()` (`focus()` too); `autoComplete="current-password"` + `name` lets the browser save and fill it (default `off` keeps managers away); wipes itself on unmount; React only (a DSL page cannot hold a ref). Never use FieldText for a secret. |
| `FieldTextarea` | atomic | label, value, onChange, rows, mono, placeholder, required | Labelled multi-line text input with configurable rows and optional monospace; pick over FieldText for long text. |
| `FieldTime` | atomic | label, value, onChange, is12Hour, minuteStep, placeholder, required | Labelled form field wrapping TimePicker for a time of day stored as a string. |
| `FieldWrapper` | disposition | label, children, description, helpText, required, error | Renders label, description (above the control), required marker, help text (small muted text under the control, listed in aria-describedby) and validation message around one control; the Field components use it internally and every Field* takes `helpText`. |
| `Form` | composite | fields, actions, onSubmit, initialData, messages, validate | Form container that holds field state, tracks unsaved changes and pending state, and calls onSubmit with the collected form data. It also holds the messages (info, warning, error) from the page (`messages`), a validator (`validate`) and its fields (a field `error`): an error blocks the submit, a warning does not. |
| `TimePicker` | atomic | value, onChange, is12Hour, minuteStep, placeholder, disabled, open | Bare time-of-day input with dropdown and no label wrapper; use FieldTime for the labelled form field. |
| `UnsavedBadge` | atomic | hasChanges | Shows 'Unsaved changes' text when the form (or hasChanges) has unsaved edits, otherwise renders nothing. |

### layout

| Component | Category | Key props | What it is / when to use |
|---|---|---|---|
| `ActionBar` | disposition | children, className | Row of buttons with a gap and top margin whose buttons default to size sm; pick it for a page-level action row, not a dialog or card. |
| `Card` | disposition | children, header, footer, padding, shadow, border, onClick | Bordered surface with optional header, footer and padding, clickable when onClick is set; pick it over Section for a visually boxed group. A padded body puts a space between its children (`padding: none` stays edge to edge). |
| `CardActions` | disposition | children, className | Right-aligned row of small buttons; pick it for the action buttons inside a Card footer. |
| `Collapsible` | disposition | title, header, children, defaultOpen, open, onOpenChange | Titled toggle row with a chevron that shows or hides its children; pick it for optional content inside a page or form. `header` (instead of `title`) puts icon, name and chips in the toggle row; `open` + `onOpenChange` control it from the page. |
| `DialogFooter` | disposition | children, className | Right-aligned button row with a top border whose buttons default to size md; pick it for the bottom of dialog content. |
| `Divider` | atomic | orientation, label, className | Horizontal or vertical separator line with an optional centered label for the horizontal one. |
| `HorizontalStack` | disposition | children, gap, align, justify, wrap, itemSizes, fill | Flex row with configurable gap, alignment and justification, and optional fixed or flex width per child; pick it over VerticalStack to lay children side by side. |
| `NavBar` | disposition | children, className | Row of small ghost-style buttons with a gap; pick it for inline navigation buttons rather than tabs. |
| `PageContent` | disposition | sections, maxWidth | Centered page wrapper with a selectable max width that stacks its sections vertically; pick it as the outer container of a page. |
| `PageSection` | disposition | title, actions, children, className | Section with an h2 title, an optional actions slot at the right of the title and children below; pick it over Section when the title needs buttons. |
| `ScrollArea` | disposition | children, axis, scheme, fill, className | Scrolling region (vertical, horizontal or both) whose scrollbar can be forced dark or light to match its own surface; pick it for log or console panes. |
| `Section` | disposition | children, title, fill | Plain vertical group with an optional h2 title that becomes a named region; pick it over Card when no box is wanted. |
| `SplitLayout` | disposition | main, side, sidePosition, sideWidth, sticky, stickyTop, gap, sideFirstWhenStacked | Two columns (main plus a fixed-width side column, sticky from lg up) that stack below the lg breakpoint: the page-level split of a detail view; set `stickyTop` to the height of the fixed header above the page. |
| `StatTile` | disposition | label, value, trend, href, icon, loading, compact | Boxed KPI tile with label, value, optional trend arrow, icon, skeleton loading state and optional drill-down link; pick it for a single metric. |
| `TableRowActions` | disposition | children, className | Row of small ghost-style buttons with a tight gap; pick it for the actions cell of a table row. |
| `ThemeScope` | disposition | theme, children, surface, tokens, className | Wrapper that paints its subtree in a forced light or dark theme, or in custom token values, with matching browser color-scheme; pick it over AccentScope to change the palette. |
| `VerticalStack` | disposition | children, gap, fill | Flex column with a configurable gap; pick it over HorizontalStack to stack children top to bottom. |

### navigation

| Component | Category | Key props | What it is / when to use |
|---|---|---|---|
| `BackLink` | atomic | to, label | Sticky "Back" link with an arrow that goes to a given route or one path segment up; pick it over Breadcrumb for a single return link. |
| `Breadcrumb` | atomic | currentPath, onNavigate | Home button plus clickable path segments built from the current path, navigating through a callback; pick it to show where a nested path sits. |
| `ButtonLink` | atomic | to, label, icon, variant, size, disabled, disabledReason | Router link styled as a button (an anchor, so middle-click works); pick it over a button when the action is a navigation to a route. `disabled` drops the destination and shows `disabledReason` in a tooltip. |
| `Link` | atomic | href, label, external, variant | Plain text anchor with default, muted or danger style and optional new-tab external icon; pick it for an inline link, not a router navigation. |
| `PageTabs` | disposition | tabs, urlParam, activeTab, onChange | Tablist whose selected tab can live in the component, be controlled, or be stored in a URL search param; pick it over Tabs when the tab must survive reload or be linked. |
| `RouterProvider` | disposition | children | Provider that gives descendants router navigation and URL search param read/write, built on react-router; required by components using urlParam. |
| `Stepper` | disposition | steps, onComplete, onCancel, completedLabel, className | Multi-step wizard with numbered progress circles, Back/Next navigation and a final completion button; pick it for a sequential flow. |
| `Tabs` | disposition | tabs, defaultTab, value, onChange | Tablist with keyboard navigation and content per tab, uncontrolled by default or controlled via value; pick it over PageTabs when no URL persistence is needed. |
| `TreeView` | composite | nodes, onSelect, selectedId, defaultExpandedIds, expandedIds, onExpandChange | Expandable hierarchical list with keyboard navigation, single selection and controlled or uncontrolled expansion; pick it for nested data. |

### overlay

| Component | Category | Key props | What it is / when to use |
|---|---|---|---|
| `ConfirmDialog` | composite | open, onOpenChange, title, message, onConfirm, confirmLabel, confirmVariant | Small Dialog with a message, a Cancel button and a confirm button (danger by default); pick it over Dialog for a yes/no confirmation. An action's `confirm` question uses it when the host mounts `useConfirmDialog` (React API, with `ConfirmProvider` of dsl-renderer); otherwise the browser's native confirm. |
| `ContextMenu` | disposition | trigger, items, side, align, open, onOpenChange | Popover menu of clickable items (icon, danger, separator) opened by a trigger element; pick it for a kebab or row action menu. |
| `Dialog` | disposition | title, titleContent, children, open, onOpenChange, trigger, actions, size | Modal dialog with title (`titleContent` for a richer heading), focus trap, a body that scrolls inside the viewport, optional trigger and actions footer, in four sizes (initial focus: an element marked `data-autofocus`, else a field that took it itself, else the first control; `ButtonAction autoFocus` marks a footer button); pick it for custom content, ConfirmDialog or DialogForm for ready-made ones. |
| `DialogButton` | atomic | label, variant, action, params, body, closesDialog, disabled, disabledReason | Button for the `actions` of a `Dialog`: without `action` it closes the dialog (a Cancel); with one it runs that `$actions` entry (as an `ActionButton` does) and closes the dialog when it succeeded, leaving it open and the button busy otherwise. Pick it over `ActionButton` inside a dialog. |
| `DialogForm` | composite | title, visible, onSubmit, fields, initialData, onClose, onSubmitEdit, size | Dialog wrapping a Form with Save and Cancel, in create or edit mode depending on initialData.id; pick it to create or edit a record. Closes only through `onClose` (YAML: `onClose: $closeX` with an action `{ resultKey, clear: true }`). |
| `Drawer` | disposition | open, onClose, children, side, title, footer, size, hideCloseButton | Modal side panel sliding from left, right or bottom with optional title, footer and close button (same initial focus rule as Dialog); pick it over Dialog for a larger contextual panel. |
| `Popover` | disposition | trigger, children, side, align, open, onOpenChange, className | Floating panel of interactive content anchored to a trigger element, controlled or not; pick it over Tooltip when the content has controls, over ContextMenu when it is not a list of actions. |
| `ToastProvider` | disposition | children | Provider that renders toast notifications (success, error, info) for its children; success and info auto-dismiss, errors stay until dismissed. |
| `Tooltip` | disposition | content, rows, maxWidth, side, align, delay, describe, className, data-*, children | Hint card for a single wrapped element: portaled and kept in the viewport (never clipped), opens after a hover delay or on keyboard focus, closes on leave, click, Escape and scroll, one at a time; `content` is text or any node, `rows` gives labelled details (a long unbreakable value wraps inside the card; a row can `clamp` to 1-4 lines; `maxWidth` xs to lg widens the card); linked via aria-describedby. Pick it for a hint or structured details, Popover for interactive content. |

### table

| Component | Category | Key props | What it is / when to use |
|---|---|---|---|
| `BulkActionsToolbar` | atomic | selectedCount, onClearSelection, children | Toolbar showing "N items selected" with a Clear button and extra action children, hidden when nothing is selected; pick it above a selectable table. |
| `DataTable` | composite | rows, columns, loading, emptyMessage, onAction, selectable, batchActions, onRowClick | Full data table with sorting, selection, batch actions, row actions, expandable rows, loading and empty states; pick it for any tabular list of records. The actions column is right-aligned and only as wide as its icons (give `width` to override); a batch action takes `variant` (default `secondary`; `danger-outline` for a destructive one, a row action icon too) and `keepSelection: true` to keep the selection after it (use it before a confirm); rows that leave the table drop out of the selection. A batch action can say which selected rows it applies to (`appliesTo`: a row field, `!field`, or a function; `mode: all` (default) turns it off with the reason when a selected row does not qualify, `some` runs on the qualifying rows and labels the count; `disabledReason` overrides the message); the selection context gives `rows`, `count`, `total`. A row action can stay shown but be off for some rows: `enabledWhen` (a row field or `!field`, like `condition`) with `disabledReason` as its tooltip. The floating batch bar sits above the dev A/B dock (the dock publishes `--floating-bottom-offset`). |
| `FilterBar` | composite | search, onSearchChange, filters, onFilterChange, onClearAll, placeholder | Toolbar with a search box, filter chips and a Clear all button; pick it over SearchBar or FilterChips alone when both are needed. |
| `FilterChips` | composite | options, value, onChange, mode, bind | Row of toggle chips in multi mode (empty means all active) or single mode (exactly one active); pick it for a small set of filter values. |
| `Pagination` | atomic | total, size, urlParam, page, onPageChange | Previous/Next controls with a "Page x / y" label, driven by a URL search param or by page props; renders nothing with a single page. |
| `SearchBar` | composite | urlParam, value, onChange, placeholder, debounceMs, resetUrlParams, size, inputRef, onKeyDown, ariaControls (React only), width (sm, md, lg, full), ariaLabel, ariaDescribedBy | Debounced text search input, backed by a URL search param or by value/onChange, with optional focus expansion and sm size. |
| `SortableColumn` | atomic | label, sortKey, currentSort, onSort | Table header cell (th) with a sort button and direction icon plus aria-sort; pick it to build a sortable column header by hand. |

### React API (not DSL nodes)

| Export | Signature / props | What it is |
|---|---|---|
| `AppShell` | brand, tabs, tabsLabel, menu, children, actions, renderLink, barOnScroll, menuVariant | Application frame with sticky top bar (brand, tabs, actions), sticky side menu and content, not a registry node; routing stays in the host via renderLink. |
| `AccentScope` | color, children | CSS-scope wrapper that recolors the primary accent of its subtree with one color, keeping the surrounding palette; portals are not covered, use useRootAccent for those. |
| `useRootAccent` | solid | React hook that recolors the accent of the whole document, portals included, while mounted; prefer AccentScope for a subtree. |
| `accentVariables` | solid | Pure function returning the four --color-primary* CSS variable values derived from one solid color, using light-dark() and color-mix(). |
| `warnIfAccentUnsupported` |  | Development-only function that warns once when the browser lacks light-dark() or color-mix(); does nothing where CSS.supports is missing. |
| `ACCENT_VARIABLES` |  | Constant tuple of the four accent CSS variable names (--color-primary, -solid, -solid-hover, -light) that accentVariables returns. |
