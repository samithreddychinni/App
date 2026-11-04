# Regression Verification Protocol: Issue #105709

## Issue Summary
**Issue**: [#105709](https://github.com/Expensify/App/issues/105709) - `[Sentry: APP-HWF / APP-N6Q / APP-M76] Web: CanvasKit load failures escape SkiaWebChart as unhandled rejections`

## Root Cause
1. `isSkiaWebSupported()` in `src/components/Charts/SkiaWebChart/isSkiaWebSupported.ts` probed only WebGL availability (`getProbeContext()`), omitting validation that the global `WebAssembly` API is defined and functional.
2. In environments where WebAssembly is disabled (such as Microsoft Edge Enhanced Security Mode in strict mode, hardened enterprise browser profiles, or restricted webviews), `isSkiaWebSupported()` returned `true` because WebGL context creation succeeded.
3. `SkiaWebChart` subsequently mounted `<WithSkiaWeb>`, which triggered `LoadSkiaWeb()` and `CanvasKitInit()`. `CanvasKitInit` immediately referenced `WebAssembly.instantiateStreaming`, resulting in `ReferenceError: WebAssembly is not defined` (`APP-HWF`).
4. In addition, when `canvaskit.wasm` fails to fetch over the network (offline mode, CDN hiccups, proxy interference), the asynchronous WebAssembly instantiation fails with `RuntimeError: Aborted(both async and sync fetching of the wasm failed)`. While `SkiaWebChart` wraps the renderer in React's `<ErrorBoundary>` (which gracefully catches the error to display `<ChartFailedToLoad />` and reports a structured warning via `logSkiaLoadError`), the underlying wasm rejection escaped as an unhandled promise rejection to `window.onunhandledrejection`, generating unhandled fatal Sentry errors (`APP-M76`, `APP-N6Q`).

## Fix
1. **Capability Gate in `isSkiaWebSupported.ts`**:
   Add an explicit check for `typeof WebAssembly !== 'undefined' && typeof WebAssembly.instantiate === 'function'` before probing WebGL. If WebAssembly is disabled or unsupported, `isSkiaWebSupported()` immediately returns `false`. `SkiaWebChart` peacefully displays `<ChartUnavailable />` without ever mounting `<WithSkiaWeb>`, eliminating `APP-HWF`.
2. **Unhandled Rejection Filtering in `setupSentry.ts`**:
   Add `/both async and sync fetching of the wasm failed/` and `/WebAssembly is not defined/` to Sentry's `ignoreErrors`. Real CanvasKit load failures continue to be captured as structured warnings in `SkiaWebChart`'s `logSkiaLoadError` under fingerprint `['skia-web-chart-load-failure']`, while the leaked unhandled browser rejections are silenced.

## Automated Verification
Run:
```bash
bun test ./tests/unit/CanvasKitWebAssemblyRegressionTest.ts
```
Expected: 4 tests passing verifying WebAssembly undefined, invalid instantiate, operational WebAssembly/WebGL2, and Sentry regex patterns.
