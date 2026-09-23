# Desktop CI

The root `.gitlab-ci.yml` runs verification and unpacked builds for branch pushes
and merge requests. Duplicate branch pipelines are suppressed when a merge request
is open. Artifacts expire after seven days; this pipeline does not publish releases.

## GitLab runners

- Linux: `saas-linux-small-amd64`, official Node 24.19.0 Debian image.
- Windows: `saas-windows-medium-amd64`, official Node 24.19.0 archive with a pinned
  SHA-256 check. GitLab's Windows executor uses PowerShell and does not accept a
  Docker image.
- macOS: `saas-macos-medium-m1`, `macos-26-xcode-26`, official Node 24.19.0 arm64
  archive with a pinned SHA-256 check. Enable with `ENABLE_MACOS_CI=true` only when
  the namespace has access to GitLab-hosted macOS runners.

Every job runs `npm ci`, `npm run check`, the dependency audit, and an unpacked host
build. Native UI smoke runs locally (and in the retained GitHub macOS job) with a
disposable database. GitLab-hosted macOS runners do not support UI interaction,
so their job only checks and packages. Signing identity auto-discovery is disabled;
macOS bundles use an explicit ad-hoc signature. Windows
and Linux jobs establish compilation/tests/packaging, not interactive installation
or every native OS behavior. Those checks still need their respective devices.

Runner access and compute quotas belong to the destination namespace. A pending
job may need hosted runners enabled. Self-managed GitLab requires equivalent
runners and appropriate tag/image changes. No application API key or wallet
address is needed by CI, and live provider calls are excluded from tests.

macOS hosted runners require an eligible Premium/Ultimate or Open Source plan;
local macOS checks remain available without that service. The GitHub workflow is
kept for mirrors and checks all three platforms there. Public macOS distribution
requires a Developer ID signing override and notarization; an ad-hoc signature
only establishes local bundle integrity, not Apple publisher trust.

Sources checked 23 September 2026: [Linux runners](https://docs.gitlab.com/ci/runners/hosted_runners/linux/),
[Windows runners](https://docs.gitlab.com/ci/runners/hosted_runners/windows/),
[macOS runners](https://docs.gitlab.com/ci/runners/hosted_runners/macos/),
[Node archive checksums](https://nodejs.org/dist/v24.19.0/SHASUMS256.txt).
