# Component Roadmap -- DSL Package Layering

**Date:** 2026-09-11
**Basis:** Analysis of actual applications in Workspace_Tooling + Workspace_Other
**Status:** Data-driven prioritization ready

## Synthesis of Workspace Analysis

Both workspaces reveal **identical priority pattern**:

### Combined evidence (across both workspaces)

| Component | Workspace_Tooling apps blocked | Workspace_Other apps blocked | Total LOC wasted | Priority |
|-----------|---------|---------|---------|----------|
| DatePicker, TimePicker, DateRangePicker | agent-fleet, orchestrator, wdrive (3 apps) | assistant, test-mantine, capability-framework (3 apps) | 350+ | **P0** |
| Drawer / Side Panel | agent-fleet, wdrive (2 apps) | dsl-ui-wdrive (1 app) | 200+ | **P0** |
| Advanced DataTable (sorting, inline edit, bulk actions) | agent-fleet (529 LOC), wdrive (1558 LOC) | assistant (213 LOC), dsl-ui (26,265 LOC) | 2365+ | **P0** |
| Combobox / AsyncSelect | agent-fleet (1 app) | test-mantine (1 app) | 50+ | **P1** |
| ContextMenu / Popover | agent-fleet, wdrive (2 apps) | Multiple (2 apps) | 150+ | **P1** |
| MultiSelect / TagInput | Multiple (3 apps) | Multiple (2 apps) | 100+ | **P1** |
| Tree / Nested List | wdrive (1 app) | Multiple (2 apps) | 200+ | **P1** |
| Inline Edit Pattern | wdrive (1558 LOC in FileList) | Multiple (>100 LOC each) | 200+ | **P1** |

### Key metrics

**Total duplicate code across both workspaces:** 2500-3000 LOC

**Top 3 blockers (P0 - unblock all remaining functionality):**
1. **Date/Time Pickers** -- blocking 6 apps, 350+ LOC waste
2. **Drawer component** -- blocking 3 apps, 200+ LOC waste
3. **Advanced DataTable features** -- blocking 4 apps, 2365+ LOC waste (largest single item)

**Secondary priorities (P1 - improve developer experience, reduce custom code):**
4. AsyncSelect / Combobox
5. ContextMenu / Popover
6. MultiSelect / TagInput

## Detailed Phase Plan

### Phase 1: Unblock admin dashboards (Weeks 1-3)

**Priority:** Immediate
**Rationale:** agent-fleet and wdrive represent the most complex use cases; both need all three P0 components
**Effort:** ~2-3 weeks
**ROI:** Eliminate 2365+ LOC of duplicate table logic; unblock date-dependent features

**Components to add:**
1. **DatePicker** (single date)
   - Calendar UI with month/year navigation
   - Keyboard navigation support
   - Disabled dates support (weekends, past dates, etc.)
   - Integration: FieldDate form component

2. **DateRangePicker** (start/end dates)
   - Dual calendar or range-select UI
   - Preset ranges (Today, This week, This month, Last 30 days, Custom)
   - Clear date range button
   - Integration: FieldDateRange form component

3. **TimePicker** (time only)
   - Hour/minute input (or spinners)
   - 12-hour / 24-hour toggle
   - Integration: FieldTime form component

4. **Drawer component**
   - Slide-in from left/right/bottom
   - Animated open/close
   - Dismissible on escape or backdrop click
   - Integration point for detail views in DataTable expansion

5. **Enhanced DataTable documentation**
   - Sorting UI pattern (column header click indicators)
   - Bulk actions toolbar integration (using existing row selection)
   - Drawer detail view example (DataTable row expands → Drawer with details)
   - Inline editing hook pattern (optional; leaves implementation to consumer)

### Phase 2: Improve form diversity (Weeks 4-6)

**Priority:** High
**Rationale:** Enables flexible form building without custom code
**Effort:** ~1-2 weeks
**ROI:** Reduce custom component duplication in forms

**Components to add:**
1. **AsyncSelect / Combobox**
   - Search + async fetch capability
   - Loading state indicator
   - Integration: FieldAsyncSelect form component

2. **MultiSelect**
   - Tag display with remove button
   - Clear all button
   - Integration: FieldMultiSelect form component

3. **TagInput / TokenInput**
   - Editable list of tags
   - Add on Enter or comma
   - Integration: FieldTags form component

### Phase 3: Advanced overlays and navigation (Weeks 7-9)

**Priority:** Medium
**Rationale:** Enhance UX for complex interactions; reduce custom overlay implementations
**Effort:** ~1-2 weeks
**ROI:** Eliminate 150+ LOC of custom menu/popover code

**Components to add:**
1. **ContextMenu**
   - Positioned menu near anchor
   - Keyboard navigation
   - Example: FileList right-click menu

2. **Popover**
   - Positioned popover distinct from tooltip
   - Interactive content inside
   - Dismissible

3. **Tree / Nested List** (if high priority)
   - Expandable/collapsible tree nodes
   - Selection support
   - Drag-drop support (optional, third-party dnd-kit)

### Phase 4: Documentation and patterns (Weeks 10-12)

**Priority:** Ongoing
**Rationale:** Enable consumer adoption

**Deliverables:**
1. Storybook stories for all new components
2. Integration examples: admin dashboard layout with DateRange + DataTable + Drawer
3. Form builder patterns guide
4. Inline editing cell pattern (hook + example)
5. Bulk actions toolbar pattern (composition example)

## Decision Point: Phase 1 Scope

**Question: Should Phase 1 include all 5 components (Pickers + Drawer + DataTable docs), or split differently?**

**Option A: Full Phase 1 (Weeks 1-3)**
- Delivers complete admin dashboard capability
- Higher implementation effort
- Unblocks both agent-fleet and wdrive immediately
- Risk: Scope creep if picker UX choices prove complex

**Option B: Phased Phase 1 (Weeks 1-2, then Weeks 3)**
- Week 1-2: DatePicker, DateRangePicker, TimePicker (form fields focus)
- Week 3: Drawer + DataTable enhancement
- Lower risk per iteration
- Slower overall delivery

**Option C: Picker-first Phase 1 (Weeks 1-2)**
- DatePicker, DateRangePicker, TimePicker only
- Fastest to delivery, smallest risk
- Drawer + DataTable docs deferred to Phase 2
- Some apps remain unblocked for detail view patterns

**Recommendation:** Option A -- Full Phase 1.

Rationale: All three (pickers, drawer, table patterns) are prerequisites for admin dashboards. Splitting them only delays the complete solution. agent-fleet and wdrive both need all three to move forward. The effort is front-loaded once; splitting just extends the pain.

---

## Out of Scope for Now

**These were flagged but should not be in Phase 1-2:**
- Rich text editor (requires third-party; each app likely has specific needs)
- Code editor (similar; app-specific)
- Kanban/drag-drop tables (dnd-kit is third-party responsibility)
- Inline editing cell pattern (document as hook pattern, not built component)
- Tree component (if low priority; FileList can use DIV grid approach)

---

## Success Metrics

Phase 1 complete when:
- [ ] agent-fleet can replace CrudTable date pickers with dsl-ui DatePickers
- [ ] agent-fleet can use Drawer for detail views instead of CrudDialog
- [ ] wdrive can use dsl-ui DateRangePicker for audit filtering
- [ ] wdrive can demonstrate Drawer for file details view
- [ ] dsl-ui test coverage includes all three picker components
- [ ] Example: "Admin Dashboard with dsl-ui" shows DateRange + DataTable + Drawer working together
