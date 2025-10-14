# Content CLI – Release Management Guide

This guide describes how the **Content CLI** release lifecycle works — including feature development, release creation, and hotfixing.

---

## Overview

The Content CLI uses a **trunk-based workflow** with **semantic version bumps** and **CalVer release branches**.

| **Branch Type** | **Purpose**                                                                        |
|------------------|------------------------------------------------------------------------------------|
| `master` | Main development branch; represents the development environment.                   |
| `release/*` | Release branches named using CalVer format (e.g., `release/20251009-091337_RC00`). |

Publishing happens **only** when a version bump PR is merged.

---

## Developing a New Feature

1. Create a feature branch from `master`.
2. Implement and test your feature.
    - Testing should be done locally. Check this guide for [testing your local build of master](https://github.com/celonis/content-cli/blob/master/README.md#building-and-using-the-project-locally).
3. Open a PR targeting `master`.
4. After approval, merge your PR into `master`.
    - Merging to `master` **does not** publish anything — it only updates the development state of the CLI.

---

## Creating a Release

When the `master` branch is stable and ready for deployment, use the **Create Release** workflow.

### Steps

1. Go to **Actions → Create Release → Run workflow**.
2. Choose the bump type (`patch`, `minor`, or `major`).
3. The workflow will:
    - Validate that it’s running from `master` or a `release/*` branch.
    - Create an automation branch (`automation/release-bump-<timestamp>`).
    - Bump the version and push a commit like `[Release] Bump version to x.x.x`.
    - Open a **PR to the same branch** from which it was triggered (to master or release branch).

4. When the PR is approved and merged:
    - The **Build / Publish** workflow detects the version bump commit.
    - It builds and tests the CLI.
    - Creates a new **CalVer release branch** (e.g., `release/20251009-091337_RC00`).
    - Publishes the package to both:
        - GitHub Registry (`@celonis/content-cli`)
        - npm Registry (`@celonis/content-cli`)
    - Tags the release branch with the new semantic version (e.g., `v1.3.0`).

---

## Hotfixing a Version

When a bug is discovered in an existing published version:

1. Identify the release branch from the version tag (e.g., `release/20251009-091337_RC00` tagged with `v1.3.0`).
2. Create a hotfix branch from that release branch.
3. Implement and test the fix.
4. Open a PR targeting the same release branch.
5. Once merged, re-run the **Create Release** workflow from that release branch to bump the patch version and publish (e.g., from `v1.3.0` → `v1.3.1`).

---

## Workflows

| **Workflow** | **Trigger** | **Purpose** |
|---------------|-------------|--------------|
| **Build Pull Request** | On PR to `master` | Builds and tests changes before merging. |
| **Create Release** | Manual trigger (`workflow_dispatch`) | Creates a PR with a version bump on the current branch. |
| **Build / Publish** | On merge to `master` or `release/*` | Detects version bumps → builds, tags, and publishes. |

