# Helper Process Placeholder (Phase 1 Seam)

This directory is reserved for out-of-process helper binaries and elevation utilities in future phases.

## Phase 1 Seam
In Phase 1 (Foundation), administrative terminal elevation is disabled and ignored (`admin: false`).
In later phases:
- Windows: A standalone UAC helper binary will be built here (`terminal-helper.exe`).
- Main process will spawn `terminal-helper.exe` via `runas` to launch elevated ConPTY sessions safely without restarting the primary Electron application with administrative privileges.

## Security Rule
The main Electron application itself must **NEVER** be run elevated directly. All elevated operations are contained within isolated helper worker processes.
