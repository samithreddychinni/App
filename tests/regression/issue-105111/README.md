# Issue 105111: verification

Issue: https://github.com/Expensify/App/issues/105111

Reviewed source: `2af6c64bfad92482c0ff0c13e7cd772b540f8627`. The branch contains only the files for this issue.

## Review result

Corrected fix with editor ownership regression coverage.

The inline editor can leave INPUT_FOCUSED true. Its ref is detached before passive cleanup, so comparing the manager to composerRef.current can skip cleanup. A mount-time handle capture is also insufficient because the same web editor can receive a new imperative handle.

## Recommended change

Retain the latest non-null handle and migrate ownership when this same editor receives a replacement handle. During unmount, clear the web edit-focus flag and priority focus callback only if the manager still belongs to that editor. This covers handle replacement while preserving a newer editor that already took ownership.

## Checks

Jest paths below run with `npm test -- --runInBand --runTestsByPath <path>`. Standalone commands run from the repository root.

- `tests/ui/ReportActionItemMessageEditTest.tsx`

## Remaining verification

1. In a browser, edit text, blur/refocus, Save or Cancel, then open and close the chat header.
2. Check editor switches and narrow layout.

## Rejected alternatives

Clearing before the ownership guard can clear another editor. Capturing only the original handle fails after a handle refresh. Main-composer-only cleanup misses unmounts without a main-composer focus event.
