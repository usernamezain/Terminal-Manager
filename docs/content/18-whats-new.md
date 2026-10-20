---
id: whats-new
title: What's New
order: 18
summary: Release notes and version changelog reconstructed from commit history and feature implementation milestones.
tags:
  - changelog
  - release-notes
  - history
  - updates
since: 0.1.0
updated: 2026-10-13
---

## What It Is

This document tracks all user-facing additions, modifications, and bug fixes across Terminal Manager releases. Entries are organized chronologically with the newest version listed first.

## Version 0.1.0 (2026-10-13)

### Added

- Added complete in-app Documentation view with full-text search, topic tree, section outlines, and code copy buttons.
- Added data-driven AI Agents catalog supporting 15 CLI agents with Windows DPAPI encrypted secret storage.
- Added automated in-process `PATH` refresh following AI agent installation without requiring application restarts.
- Added multi-interpreter Script Runner with FIFO queue automation, process tree timeouts, and failure policies.
- Added Project Runner with automatic read-only detection across 10 developer ecosystems and monorepos.
- Added Shell Experience engine with app-scoped and system-wide isolation modes and 17-slot PSReadLine syntax coloring.
- Added Fast Start prompt bytecode caching and deferred plugin loading for sub-second PowerShell 7 cold startup.
- Added detachable standalone desktop windows with seamless re-docking and independent close confirmation policies.
- Added Windows notification area tray integration with background mode and startup with Windows.
- Added selection-aware right-click context menu with fixed-portal hover submenus and slide-out Actions Panel.
- Added multi-line paste confirmation modal with live line preview to prevent accidental execution.
- Added Windows Explorer context menu integration with automatic trailing-backslash normalization for drive roots.
- Added startup timeline diagnostic markers and shell memory tracking to Settings.

### Changed

- Changed terminal rendering to WebGL 2 hardware acceleration with automatic software canvas fallback.
- Changed design system to strict tokenized scale across Midnight and Graphite themes.
- Changed registry integrations to current-user (`HKCU`) only, eliminating UAC administrator requirements.
- Changed window composition to support native Windows 11 Mica and Acrylic background materials.

### Fixed

- Fixed working directory loss when spawning sessions from Explorer by escaping path arguments with quotation marks.
- Fixed bug where closing a detached standalone terminal window caused the primary application window to terminate.
- Fixed context menu dismissal during submenu scrolling by replacing window scroll listeners with portal containers.
- Fixed trailing backslash stripping on Windows drive roots (such as `C:\`) that caused shells to default to user home.
- Fixed stale `PATH` lookups after installing CLI binaries into `%USERPROFILE%\.local\bin`.

## Related Topics

- [Getting Started](01-getting-started.md)
- [Glossary](19-glossary.md)
