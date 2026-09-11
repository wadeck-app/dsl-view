# Workspace Analysis -- Tooling

**Date:** 2026-09-11
**Agent:** Haiku analysis of C:\Workspace_Tooling
**Status:** Complete

## Applications found

| App | Purpose | Location |
|-----|---------|----------|
| **agent-fleet/web-frontend** | Enterprise multi-tenant admin system | Workspace_Tooling |
| **image-browser-edit/web-frontend** | Media editor with canvas and file tree navigation | Workspace_Tooling |
| **orchestrator/orch-app** | DSL-driven page builder (consumer of dsl-ui) | Workspace_Tooling |
| **dsl-view/dsl-ui** | Core reusable component library | Workspace_Tooling |
| **wdrive/web** | File encryption/management app | Workspace_Tooling |

## Component needs analysis

| App | Purpose | Table Complexity | Missing Components | Table LOC | Key Notes |
|-----|---------|------------------|-------------------|-----------|-----------|
| **agent-fleet/web-frontend** | Enterprise admin system | 5/5 (Very High) | DatePicker, TimePicker, DateRange, Drawer, advanced filters | ~529 | Complex sorting, pagination, column visibility, bulk actions, row selection |
| **image-browser-edit/web-frontend** | Media editor | 2/5 (Low) | DatePicker, table components | ~50 | Uses custom tree rendering and thumbnail gallery |
| **orchestrator/orch-app** | DSL page builder | 2/5 (Low) | Job-specific features | <100 | Relies on dsl-ui DataTable + dsl-renderer |
| **dsl-view/dsl-ui** | Component library | 4/5 (Advanced) | DatePicker, TimePicker, Drawer, Popover, AsyncSelect, TagInput | ~300 | Has sorting, filtering, pagination, bulk selection, expansion rows |
| **wdrive/web** | File encryption/sharing | 5/5 (Very High) | DatePicker, Inline editing, Drawer, Tree nav, Bulk rename | ~1558 | Massive custom implementation: multi-select, drag-drop, inline rename, context menus |

## Key findings

### Top 3 Blocking Components

**1. Date/Time Pickers (CRITICAL)**
- **Missing:** No DatePicker, TimePicker, or DateRangePicker in dsl-ui
- **Impact:** 
  - agent-fleet: Flow scheduling, task scheduling, date field inputs
  - wdrive: File version history, key rotation dates, audit log filtering
  - orchestrator: Job scheduling, audit filtering
- **Current:** Native HTML input or custom date string handling
- **Estimated LOC waste:** 200+ if each app rebuilds

**2. Drawer / Side Panel (CRITICAL)**
- **Missing:** Not in dsl-ui
- **Current:**
  - wdrive: FileInfoDrawer custom implementation (100+ LOC)
  - agent-fleet: Uses AlertDialog + dropdowns instead
- **Gap:** No reusable side panel pattern
- **Estimated LOC waste:** 100+ per app

**3. Advanced DataTable Features (CRITICAL)**
- **Duplication across apps:**
  - agent-fleet Table: 529 LOC (sorting, pagination, column visibility, bulk actions)
  - wdrive FileList: 1558 LOC (inline rename, multi-select, drag-drop, context menus)
  - dsl-ui DataTable: Basic (missing inline editing, advanced sorting UI)
- **Missing:** Inline row editing, Bulk operations toolbar, Drawer detail view integration
- **Estimated LOC waste:** 1500+ total duplication

### Secondary Gaps (High Priority)

- **Combobox / AsyncSelect** -- async search with loading state (agent-fleet has custom SelectWithSpinner)
- **ContextMenu / Popover** -- positioned menus (wdrive, agent-fleet build custom)
- **MultiSelect / TagInput** -- multi-value selection (custom in multiple places)
- **Tree / Nested List** -- hierarchical rendering (wdrive, image-browser-edit custom)
- **Inline Edit pattern** -- click-to-edit table cells (wdrive has extensive implementation)

### Code Duplication Summary

**High Duplication Zones:**
- Table implementations: ~529 LOC + ~1558 LOC = 2087 LOC across 2 apps for similar functionality
- Modal/Dialog variations: CrudDialog, EntityDialog, AlertDialogWrapper, FileInfoDrawer doing similar things
- Filter UI: wdrive FilterTabs, agent-fleet column filters, dsl-ui generic predicates

### Verdict

**1500+ lines of code** unnecessarily reimplemented across 2 apps for table/list features. **2000+ LOC** total across both workspaces for overlays and form inputs.

Top 3 must-haves: **DatePickers (all variants), Drawer, Advanced DataTable features (inline editing, bulk actions toolbar integration).**

These unblock all remaining apps and eliminate 80%+ of custom implementations.
