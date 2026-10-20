# GitHub Repository Configuration Checklist

This checklist documents the recommended GitHub repository settings for `mughaldev0/Terminal-Manager`.

---

## 1. General Settings

- [ ] **Default Branch**: `main`
- [ ] **Features**:
  - [x] Issues enabled
  - [x] Discussions enabled
  - [x] Releases enabled
  - [ ] Wikis disabled (all documentation lives in `docs/` and markdown files)
  - [ ] Projects enabled (optional)

---

## 2. Pull Request & Merge Settings

- [ ] **Allow merge commits**: Disabled (keeps git history linear and clean)
- [ ] **Allow squash merging**: Enabled (Default)
  - Default commit message: Pull request title and description
- [ ] **Allow rebase merging**: Enabled
- [ ] **Automatically delete head branches**: Enabled

---

## 3. Branch Protection Rules (`main`)

Configure branch protection rules for the `main` branch under **Settings > Branches**:

- [ ] **Require a pull request before merging**:
  - Require approvals: 1
  - Dismiss stale pull request approvals when new commits are pushed: Enabled
  - Require review from Code Owners: Enabled
- [ ] **Require status checks to pass before merging**:
  - Require branches to be up to date before merging: Enabled
  - Required checks:
    - `Verify & Test (windows-latest)`
    - `Verify & Test (ubuntu-latest)`
- [ ] **Require conversation resolution before merging**: Enabled
- [ ] **Require signed commits**: Recommended
- [ ] **Do not allow bypassing the above settings**: Enabled (enforce for administrators)

---

## 4. Security & Analysis

Under **Settings > Code security and analysis**:
- [x] Dependabot alerts: Enabled
- [x] Dependabot security updates: Enabled
- [x] Secret scanning: Enabled
- [x] Secret scanning push protection: Enabled
- [x] Private vulnerability reporting: Enabled (allows researchers to submit advisories privately)
