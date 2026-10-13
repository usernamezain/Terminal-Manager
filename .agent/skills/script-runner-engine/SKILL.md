---
name: script-runner-engine
description: Managing, authoring, and verifying the sequential Script Runner execution queue, timeouts, and CodeMirror integration in Terminal Manager.
---

# Script Runner Engine Skill

This skill explains how the Script Runner queue, execution engine, and process management work in Terminal Manager.

## 1. Core Architecture

The Script Runner is divided into:
* **Main Process (`src/main/scripts/`)**:
  * `scriptRunner.ts`: State machine, queue manager, process execution, timeout watcher, and output streaming over IPC.
  * `scriptStore.ts`: Atomic persistence of user's script library (`scripts.json`).
* **Renderer Process (`src/renderer/features/scripts/`)**:
  * `ScriptRunnerView.tsx`: Split layout view (Sidebar Library + Editor/Queue Panel).
  * `ScriptEditor.tsx`: CodeMirror code editor with auto-completion and syntax highlighting.
  * `QueueView.tsx`: Real-time queue list, drag reordering, status indicators, and ANSI output terminal.
  * `useScriptsStore.ts`: Zustand store keeping UI state synchronized with the main process.

## 2. Queue State Machine

```text
[ Idle ] ──► (enqueue item) ──► [ Waiting in Queue ]
                                         │
                                         ▼ (runner advances)
                                   [ Running ]
                                         │
           ┌───────────────┬─────────────┴─────────────┬──────────────┐
           ▼               ▼                           ▼              ▼
     [ Succeeded ]    [ Failed ]                 [ Timed Out ]   [ Cancelled ]
           │               │                           │              │
           │          (onFailure)                      │              │
           │         stop / continue                   │              │
           ▼               ▼                           ▼              ▼
       (advance)      (stop queue                     (stop)         (stop)
                       or advance)
```

## 3. Key Guarantees
1. **Strict FIFO Sequential Execution**: Script $B$ never spawns until Script $A$ has completely exited and its stdout has flushed.
2. **Failure Handling**:
   - `onFailure: "stop"` (default): Skips remaining items and marks queue as stopped.
   - `onFailure: "continue"`: Logs the error and continues to the next item.
3. **Timeout Protection**: If `timeoutMs` expires, the main process calls `terminateProcessTree(pid)`, marks the script as `timed-out`, and halts the queue safely.
4. **ANSI Streaming**: Live output is pushed via `webContents.send('scripts:output')` and rendered using standard terminal xterm / ANSI decoders.
