# Implementation Plan: Phase 1 - dsl-ui Component Enhancements

**Spec:** .claude/specs/2026-09-11_dsl-package-layering/

**Date:** 2026-09-11
**Phase:** Phase 1 (Weeks 1-3)
**Goal:** Deliver DatePickers + Drawer + Advanced DataTable patterns
**Success Metric:** Unblock agent-fleet + wdrive; eliminate 2500+ LOC duplicate code across workspace

---

## Timeline Overview

| Week | Step | Component | Deliverable | Validation |
|------|------|-----------|-------------|-----------|
| W1 | 1 | DatePicker | Single-date calendar UI + FieldDate | Unit tests + Storybook |
| W1-W2 | 2 | DateRangePicker | Dual-calendar range UI + FieldDateRange + presets | Unit tests + Storybook + integration test |
| W2 | 3 | TimePicker | Hour/minute UI + FieldTime | Unit tests + Storybook |
| W2-W3 | 4 | Drawer | Slide-in overlay from side | Unit tests + Storybook + interaction demo |
| W3 | 5 | DataTable enhancements | Sorting UI, bulk actions patterns, drawer integration docs | Examples + Storybook integration story |
| W3 | 6 | Integration example | Admin dashboard demo: DateRange + DataTable + Drawer | Live screenshot + walkthrough |

---

## Step 1: DatePicker Component (Single Date)

**Deliverable:** `src/components/form/DatePicker.tsx` + `src/components/form/FieldDate.tsx`

**Requirements:**
- Calendar UI (month/year navigation)
- Date selection and display
- Keyboard navigation (arrows, enter, escape)
- Disabled dates support (weekends, past dates)
- Tailwind styling + Radix Dialog integration
- Fully typed (React 19)

**Validation:**
- [ ] Unit tests: date selection, navigation, keyboard, disabled state
- [ ] Storybook stories: default, disabled dates, controlled/uncontrolled
- [ ] Screenshot: Basic calendar interaction
- [ ] Form integration: FieldDate component renders + submits correctly

**Dependencies:**
- Radix UI Dialog (for positioning overlay)
- date-fns (for date math)
- Existing form component patterns (FieldText, FieldSelect)

---

## Step 2: DateRangePicker Component

**Deliverable:** `src/components/form/DateRangePicker.tsx` + `src/components/form/FieldDateRange.tsx`

**Requirements:**
- Dual calendar display (start / end dates)
- Range selection (click start, click end)
- Preset buttons: Today, This Week, This Month, Last 30 Days, Custom
- Clear range button
- Tailwind styling + Radix Dialog
- Form integration

**Validation:**
- [ ] Unit tests: range selection, presets, keyboard navigation, clear
- [ ] Storybook stories: presets, custom range, controlled/uncontrolled
- [ ] Screenshot: Range picker with presets active
- [ ] Integration test: DateRange in a form submission

**Dependencies:**
- DatePicker component (Step 1)
- date-fns utility functions

---

## Step 3: TimePicker Component

**Deliverable:** `src/components/form/TimePicker.tsx` + `src/components/form/FieldTime.tsx`

**Requirements:**
- Hour/minute selection (spinners or input boxes)
- 12-hour / 24-hour mode toggle
- Keyboard navigation
- Form integration (FieldTime)

**Validation:**
- [ ] Unit tests: time selection, mode toggle, keyboard
- [ ] Storybook stories: 12h, 24h, controlled/uncontrolled
- [ ] Screenshot: Time picker in form
- [ ] Form submission: TimeField captures and submits time correctly

**Dependencies:**
- Existing FieldText patterns
- Tailwind for spinner/input styling

---

## Step 4: Drawer Component (Side Panel Overlay)

**Deliverable:** `src/components/overlay/Drawer.tsx`

**Requirements:**
- Slide-in overlay from left/right/bottom (configurable)
- Dismissible on escape or backdrop click
- Header + body + footer structure
- Animated open/close
- Tailwind + Radix Dialog integration
- Z-index management (stack above modals)

**Validation:**
- [ ] Unit tests: open/close, dismiss on escape/backdrop, side placement
- [ ] Storybook stories: left, right, bottom, with different content
- [ ] Screenshot: Drawer opened with content
- [ ] Interaction test: Escape key closes, backdrop click closes

**Dependencies:**
- Radix UI Dialog (positioning, focus management)
- Existing overlay patterns (Dialog, ConfirmDialog)

---

## Step 5: Advanced DataTable Patterns (Documentation + Examples)

**Deliverable:** 
- `docs/data-table-patterns.md` (comprehensive guide)
- Example components: SortableColumn, BulkActionsToolbar, TableDrawerDetail
- Storybook story: "DataTable with all features"

**Requirements:**
- Sorting: Column header click → sort indicators + state management
- Bulk actions: Checkbox selection → toolbar with action buttons
- Drawer integration: Row expansion → opens Drawer with detail view
- Example: Complete admin table (users/items) with all three patterns

**Validation:**
- [ ] Documentation review: Clear examples, copy-paste ready code
- [ ] Storybook story: All patterns working together
- [ ] Screenshot: Admin table with sorting + bulk actions + drawer open
- [ ] Test: Sorting changes data order, bulk select fires action, drawer opens/closes

**Dependencies:**
- DateRangePicker (for filtering example)
- Drawer component (Step 4)
- Existing DataTable component

---

## Step 6: Integration Example (Admin Dashboard Demo)

**Deliverable:** 
- Example app: `examples/admin-dashboard.tsx`
- Storybook page: "Patterns > Admin Dashboard"
- Screenshots: Full workflow demo

**Content:**
- Header with DateRange filter (users by created date)
- DataTable of items with sorting + selection
- Bulk actions toolbar (delete, export, status change)
- Row detail view in Drawer (opens when row clicked or expand button)
- Form inside Drawer for editing

**Validation:**
- [ ] Live demo screenshot: Dashboard with all components visible
- [ ] Workflow test: Filter by date → sort table → select rows → bulk action → open drawer → edit
- [ ] Review: Code quality, accessibility, performance

---

## Acceptance Criteria (Phase 1 Complete)

### Functional
- [ ] All 5 components exist and are exported from `@wadeck-app/dsl-ui`
- [ ] All components have unit tests (>80% coverage each)
- [ ] All components have Storybook stories with multiple states
- [ ] Form integration: FieldDate, FieldDateRange, FieldTime work in Form component
- [ ] Drawer + DataTable work together (detail view pattern)
- [ ] Admin dashboard example demonstrates all patterns

### Quality
- [ ] TypeScript strict mode: no `any` types
- [ ] ESLint: zero errors
- [ ] Tailwind: all styles via utility classes
- [ ] Accessibility: keyboard navigation, screen reader support
- [ ] Performance: no unnecessary re-renders (verify with React DevTools)

### Documentation
- [ ] README or Storybook cover all 5 components
- [ ] Data table patterns doc complete
- [ ] Admin dashboard example explained
- [ ] Migration guide for existing apps (how to replace custom DatePicker/Drawer)

### Testing
- [ ] Unit tests run successfully (`npm run test`)
- [ ] Build succeeds (`npm run build`)
- [ ] No TypeScript errors
- [ ] Storybook builds without errors

### Validation
- [ ] Screenshots: DatePicker, DateRangePicker, TimePicker, Drawer, Admin dashboard
- [ ] Code review: Another team member (or simulated review checkpoint)
- [ ] Manual testing: All workflows in Storybook interact correctly

---

## Implementation Strategy

### Per-step approach:
1. **Implement** component (code)
2. **Test** (unit tests + integration tests)
3. **Document** (Storybook + comments)
4. **Screenshot** (validation visual)
5. **Review** (design patterns, accessibility, performance)

### Parallelization opportunities:
- Steps 1-3 (DatePicker, DateRangePicker, TimePicker) can overlap (share date utilities)
- Step 4 (Drawer) can start in parallel with Steps 1-3 (independent)
- Steps 5-6 depend on Steps 1-4, so sequential

### Risk mitigation:
- DatePicker UX: Start simple (calendar only); add presets in DateRangePicker
- Drawer positioning: Use Radix Popover as foundation (already proven)
- DataTable patterns: Document existing behavior first; no changes to core DataTable API

---

## Success Indicators (Post-Phase 1)

- [ ] agent-fleet can delete CrudTable and use dsl-ui DatePickers + Drawer
- [ ] wdrive can replace FileInfoDrawer custom code with dsl-ui Drawer
- [ ] orchestrator can add scheduling features with dsl-ui TimePicker
- [ ] All workspace apps have zero compile errors with new components
- [ ] Storybook page for "Patterns > Admin Dashboard" guides new consumers

---

## Known Unknowns (To clarify during implementation)

1. **Date picker interaction:** Click to select vs. range drag? (Clarify in Step 1)
2. **Drawer animation:** Slide duration + easing preference? (Default to 200ms, easeInOut)
3. **Bulk actions:** Fixed toolbar vs. floating? (Recommend fixed bottom; document both)
4. **Keyboard:** Tab order in date picker? (Radix Dialog handles; test during Step 1)

---

## Next Steps After Phase 1

- Phase 2: AsyncSelect, MultiSelect, TagInput, ContextMenu (Weeks 4-6)
- Phase 3: Tree component, advanced filters, inline editing pattern (Weeks 7-9)
- Phase 4: Documentation refinement, migration guides for existing apps (Weeks 10-12)
