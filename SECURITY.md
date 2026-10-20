# Security Policy

Terminal Manager takes the security of our users and developers seriously. This document describes our supported versions, reporting process, and disclosure policies.

---

## Supported Versions

Only the latest active major/minor release receives security updates:

| Version | Supported | Notes |
| :--- | :--- | :--- |
| **0.1.x** | :white_check_mark: | Current active release |
| **< 0.1.0** | :x: | Development / alpha releases |

---

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities via public GitHub issues, discussions, or pull requests.**

If you discover a security vulnerability in Terminal Manager, please report it privately:

1. **GitHub Private Security Advisory**:
   - Go to the **Security** tab of [https://github.com/mughaldev0/Terminal-Manager](https://github.com/mughaldev0/Terminal-Manager).
   - Click **Report a vulnerability** to open a private disclosure report.
2. **Direct Security Contact**:
   - Alternatively, email **security@terminalmanager.app** with:
     - A clear description of the vulnerability.
     - Steps to reproduce or proof-of-concept (PoC) code.
     - Affected versions and configurations.
     - Impact analysis (e.g., privilege escalation, remote code execution, sensitive data exposure).

---

## Security Response SLA

- **Acknowledgment**: Within 48 hours of receiving the report.
- **Initial Assessment**: Within 5 business days, including confirmation of severity and affected components.
- **Fix & Release**: We target releasing a patch within 14 to 30 days depending on complexity.
- **Public Disclosure**: Coordinated disclosure will occur after a patched release is published.

---

## Security Invariants in Terminal Manager

- **Context Isolation**: Renderer windows run with `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`.
- **Sender-Based Resolution**: Handlers never trust incoming sender claims; window IDs are derived from `event.sender`.
- **Registry Safety**: Only `HKCU` registry entries are ever registered. No administrator elevation or `HKLM` writes are performed.
- **No Keystroke Prompt Injection**: CWD tracking relies strictly on OSC 7 shell integration sequences, avoiding arbitrary command injection into shell buffers.
- **Diagnostic Privacy**: The built-in diagnostics tool automatically redacts user paths, usernames, and API tokens before export.
