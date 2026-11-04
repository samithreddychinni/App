# Regression Verification Protocol: Issue #105707

## Issue Summary
**Issue**: [#105707](https://github.com/Expensify/App/issues/105707) - `[Sentry: APP-JKQ] Web: BaseGenericTooltip loops into "Maximum update depth exceeded" in Search expense report rows`

## Root Cause
In `src/components/Tooltip/GenericTooltip.tsx`:
1. Once a cell tooltip is hovered, `setIsRendered(true)` mounts `BaseGenericTooltip`.
2. When the mouse leaves, `hideTooltip()` sets `isVisible(false)`, but `isRendered` remains `true`.
3. In virtualized lists (such as `ExpenseReportSearchView` in Search), list rows are recycled as the user scrolls. When a recycled row receives updated props, its `text` changes.
4. Because `BaseGenericTooltip` is keyed by `[text, ...renderTooltipContentKey, preferredLocale].join('-')`, changing `text` on a hidden tooltip unmounts and remounts `BaseGenericTooltip`.
5. On mount, `BaseGenericTooltip/index.tsx:69-83` executes `useLayoutEffect`, measuring width and height and dispatching `setContentMeasuredWidth` and `setWrapperMeasuredHeight` unconditionally without checking whether the measured dimensions differ from previous state.
6. When rapid recycling or concurrent row updates occur, repeated layout effect dispatches trigger cascading renders, exceeding React's maximum update depth and crashing the app.

## Fix
1. In `src/components/Tooltip/GenericTooltip.tsx`:
   - When `!isVisible && prevText !== undefined && prevText !== text`, reset `isRendered` to `false`. This prevents inactive tooltips on recycled list rows from continuously mounting and measuring unrendered DOM nodes.
2. In `src/components/Tooltip/BaseGenericTooltip/index.tsx`:
   - Add equality guards to `setContentMeasuredWidth` and `setWrapperMeasuredHeight` updater callbacks so state dispatches only occur when measured dimensions actually change.

## Verification Protocol

### Test Case 1: Fast scrolling through Search expense report rows on Web
1. Open Expensify on Web.
2. Navigate to Spend > Search.
3. Switch to the Expense reports tab with dozens of reports.
4. Hover over an expense report row cell to display its tooltip.
5. Move mouse away and rapidly scroll up and down through the list so rows are actively recycled.
6. **Expected**: The list scrolls smoothly with zero React crashes or "Maximum update depth exceeded" errors.

### Test Case 2: Hovering recycled row cells
1. Scroll down to a previously unvisited row.
2. Hover over the report name or cell.
3. **Expected**: The tooltip appears smoothly at the correct position with accurate dimensions.
