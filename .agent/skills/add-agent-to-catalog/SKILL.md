---
name: add-agent-to-catalog
description: Use when adding a new AI coding CLI agent to resources/agents.catalog.json and updating detection logic and documentation.
---

# Adding an AI Agent to the Catalog

Follow this procedure to add a new AI CLI agent to Terminal Manager's catalog.

## Files to Touch
1. `resources/agents.catalog.json`: Add catalog entry with verified install methods, sign-in type, and date.
2. `src/shared/agentTypes.ts`: Verify data schema compatibility.
3. `src/main/ai-agents/agentDetector.ts`: Add known binary search paths if non-standard.
4. `docs/content/12-ai-agents.md`: Add row to the Supported AI Agents Catalog table.

## Numbered Procedure
1. **Verify Official Documentation**:
   - Check the vendor's official installation documentation for Windows.
   - Note the exact binary name, install scripts, authentication command, and pricing structure.
2. **Add Entry to `resources/agents.catalog.json`**:
   ```json
   {
     "id": "myagent",
     "name": "MyAgent CLI",
     "vendor": "Vendor Name",
     "description": "Short factual description of what the agent does",
     "command": "myagent",
     "versionArgs": ["--version"],
     "installMethods": [
       {
         "id": "powershell-native",
         "label": "Native Installer (PowerShell)",
         "shell": "powershell",
         "command": "irm https://myagent.dev/install.ps1 | iex",
         "requires": ["git"],
         "isScriptPipe": true,
         "source": "myagent.dev",
         "recommended": true
       }
     ],
     "signIn": {
       "type": "browser",
       "instructions": "Authenticate with 'myagent auth login'",
       "command": "myagent auth login"
     },
     "cost": {
       "note": "Free tier available; BYOK API key for higher usage",
       "verifiedOn": "2026-10-13"
     },
     "docsUrl": "https://docs.myagent.dev",
     "status": "active",
     "windows": "native",
     "knownInstallDirs": ["%USERPROFILE%\\.local\\bin"]
   }
   ```
3. **Register Known Install Dirs in Detector**:
   If the installer places the binary outside standard Windows `PATH` (such as `%LOCALAPPDATA%\myagent\bin`), add the directory to `knownInstallDirs` so `agentDetector.ts` discovers it automatically.
4. **Update Documentation Table**:
   Add the agent to the table in `docs/content/12-ai-agents.md` matching the exact schema.
5. **Run Checks**:
   ```bash
   npm run docs:check
   npx vitest run
   ```

## Verification Checklist
- [ ] Agent appears in the AI Agents view (`Ctrl+Shift+G`).
- [ ] Clicking Install runs the verified script.
- [ ] If already installed, status displays the detected version string.
- [ ] Agent appears in the right-click menu and tray menu if toggled on.
- [ ] `docs/content/12-ai-agents.md` table is updated.

## Common Mistakes
- **Unverified install scripts**: Never copy unverified third-party scripts. Only use official vendor installation commands.
- **Missing `verifiedOn` date**: Always include the current ISO date (`YYYY-MM-DD`) when verifying catalog information.
