# Issue 105012: verification

Issue: https://github.com/Expensify/App/issues/105012

Reviewed source: `2af6c64bfad92482c0ff0c13e7cd772b540f8627`. The branch contains only the files for this issue.

## Review result

Already reported deployed; verify the native dependency graph before proposing another update.

The issue maintainer says the update was deployed and requests payment. The App wildcard declaration alone does not establish the HybridApp runtime selection. The queued claim about an exact resolved transitive version lacks a Gradle report.

## Recommended change

Use the branch Gradle verification task on the configured HybridApp runtime and inspect dependencyInsight. Verify aligned artifacts and a release containing the certificate blocking. Retain the URLConnection adapter. Make no further version pin or global force until the effective graph identifies the owning declaration.

## Checks

Jest paths below run with `npm test -- --runInBand --runTestsByPath <path>`. Standalone commands run from the repository root.

No automated native result is claimed. Use the checks below in the configured device or build environment.

## Remaining verification

1. Run the supplied Gradle verification task in the HybridApp Android project.
2. Build release and exercise Plaid, certificate pinning and HTTPS.
3. No Android SDK/HybridApp build was available locally.

## Rejected alternatives

A global force can downgrade another native module or override the deployed fix. Jest cannot verify a Maven artifact or native TLS behavior.

Run from the configured Android project: `./gradlew --init-script <path-to-this-branch>/tests/regression/issue-105012/verify-resolved-okhttp.gradle :app:verifyResolvedOkHttpSecurityUpdate`. The task resolves `productionReleaseRuntimeClasspath`; if the HybridApp uses a different production variant, select that actual runtime configuration before running.

Primary release evidence: https://lysine.dev/okhttp/changelogs/changelog_4x/ . The issue's deployment/payment comment is the evidence that this work has already been assigned and deployed.
