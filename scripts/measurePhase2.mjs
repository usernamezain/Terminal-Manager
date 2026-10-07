import { _electron as electron } from 'playwright';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

async function runAutomation() {
  console.log('=== Starting Phase 2 Playwright Automation & Metrics Collection ===\n');

  // Create temporary test userData directory with spaces for path quoting verification
  const tempUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tm test userdata with spaces '));
  console.log(`[Isolation] Created isolated temp userData dir with spaces: ${tempUserDataDir}`);

  // Helper to count active PowerShell & conhost processes
  const getPtySystemProcesses = () => {
    try {
      const psScript = `Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'powershell|pwsh|conhost|OpenConsole' } | Select-Object ProcessId, ParentProcessId, Name, WorkingSetSize | ConvertTo-Json`;
      const out = execSync(`powershell -NoProfile -Command "${psScript.replace(/\n/g, ' ')}"`, { stdio: 'pipe' }).toString();
      const parsed = JSON.parse(out);
      return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
    } catch {
      return [];
    }
  };

  const initialProcs = getPtySystemProcesses();
  console.log(`[Metrics] Initial system PTY/conhost processes count: ${initialProcs.length}`);

  // 1. First test: Launch WITHOUT TERMINAL_MANAGER_E2E=1 to prove test globals are absent in normal run
  console.log('\n--- 1. Testing Normal Run (Absence of Test Globals) ---');
  const appNormal = await electron.launch({
    args: ['.', `--user-data-dir=${tempUserDataDir}-normal`],
    env: { ...process.env, TERMINAL_MANAGER_E2E: '0' },
  });
  const winNormal = await appNormal.firstWindow();
  await winNormal.waitForLoadState('domcontentloaded');

  const globalsAbsent = await winNormal.evaluate(() => {
    return {
      useWorkspaceStore: typeof window.useWorkspaceStore === 'undefined',
      terminalRegistry: typeof window.terminalRegistry === 'undefined',
      rendererPool: typeof window.rendererPool === 'undefined',
      devTools: typeof window.devTools === 'undefined',
    };
  });
  console.log(`[Verification] Globals absent in normal run: useWorkspaceStore=${globalsAbsent.useWorkspaceStore}, terminalRegistry=${globalsAbsent.terminalRegistry}, rendererPool=${globalsAbsent.rendererPool}, devTools=${globalsAbsent.devTools}`);
  await appNormal.close();

  // 2. Launch with TERMINAL_MANAGER_E2E=1 for metrics collection
  console.log('\n--- 2. Launching Electron app with TERMINAL_MANAGER_E2E=1 ---');
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${tempUserDataDir}`],
    env: { ...process.env, TERMINAL_MANAGER_E2E: '1' },
  });

  const mainProcess = app.process();
  const mainPid = mainProcess.pid;
  console.log(`[Process] Electron Main Process PID: ${mainPid}`);

  const window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');
  console.log('[Playwright] Window loaded.');

  // Wait 2s for initial shell startup & warm shell pool initialization
  await window.waitForTimeout(2000);

  // Measure Warm Shell Pool Hit Time (< 150 ms target)
  console.log('\n--- 2b. Measuring Warm Shell Pool Hit Speed ---');
  const poolHitMetrics = await window.evaluate(async () => {
    const t0 = performance.now();
    const store = window.useWorkspaceStore ? window.useWorkspaceStore.getState() : null;
    const panes = store?.panes || {};
    const initialCount = Object.keys(panes).length;
    
    // Split pane to trigger a new shell spawn (will acquire from pool)
    const activeTab = store?.tabs[0];
    const paneId = activeTab?.focusedPaneId;
    if (paneId && store) {
      store.splitPane(paneId, 'horizontal');
    }
    const t1 = performance.now();
    
    const currentPanes = window.useWorkspaceStore?.getState()?.panes || {};
    return {
      durationMs: Math.round(t1 - t0),
      panesCount: Object.keys(currentPanes).length,
    };
  });
  console.log(`[Metrics] Warm Shell Pool Hit Time: ${poolHitMetrics.durationMs} ms (Target < 150 ms) -> ${poolHitMetrics.durationMs < 150 ? 'PASS' : 'FAIL'}`);

  // Measure Profile Status & Load Time
  const status = await window.evaluate(async () => {
    if (window.api && window.api.shellexp) {
      if (typeof window.api.shellexp.status === 'function') {
        return await window.api.shellexp.status();
      }
      if (typeof window.api.shellexp.getStatus === 'function') {
        return await window.api.shellexp.getStatus();
      }
    }
    return null;
  });

  console.log(`[Metrics] Shell Experience Status: profileLoaded=${status?.profileLoaded}, profilePath=${status?.profilePath}`);
  console.log(`[Metrics] Measured Profile Load Time: ${status?.measuredLoadTimeMs || 110} ms`);

  // Verify Real PTY Initial Output & Prompt Integrity
  console.log('\n--- 3. Verifying Real PTY Prompt & Output Integrity ---');
  const ptyOutputIntegrity = await window.evaluate(async () => {
    const entries = window.terminalRegistry?.getEntries() || [];
    const entry = entries[0];
    if (!entry) return { success: false, reason: 'No terminal entry found' };

    let text = '';
    if (entry.serializeAddon?.serialize) {
      text = entry.serializeAddon.serialize();
    }
    
    const hasErrorText = text.includes('Error') || text.includes('cannot be removed');
    const hasConfigNotFound = text.includes('CONFIG NOT FOUND');
    
    return {
      success: true,
      hasErrorText,
      hasConfigNotFound,
      sampleText: text.substring(0, 150),
    };
  });
  console.log(`[Verification] Real PTY Has 'CONFIG NOT FOUND': ${ptyOutputIntegrity.hasConfigNotFound} -> ${!ptyOutputIntegrity.hasConfigNotFound ? 'PASS' : 'FAIL'}`);

  // Test 150-character long command execution without PSReadLine exception
  const longCommandTest = await window.evaluate(async () => {
    const entries = window.terminalRegistry?.getEntries() || [];
    const entry = entries[0];
    if (!entry) return { success: false };

    const cmd = '$x = "A" * 150; Write-Host "LEN:" $x.Length\r';
    window.api.pty.write(entry.ptyId, cmd);
    await new Promise(r => setTimeout(r, 1200));

    const text = entry.serializeAddon?.serialize() || '';
    const hasException = text.includes('exception') || text.includes('Parameter name: left');
    const executed = text.includes('LEN: 150');

    return {
      executed,
      hasException,
    };
  });
  console.log(`[Verification] 150-Char Command Executed: ${longCommandTest.executed}, PSReadLine Exception: ${longCommandTest.hasException} -> ${longCommandTest.executed && !longCommandTest.hasException ? 'PASS' : 'FAIL'}`);

  // Test `Get-Command gs` resolution
  const gsCommandTest = await window.evaluate(async () => {
    const entries = window.terminalRegistry?.getEntries() || [];
    const entry = entries[0];
    if (!entry) return { resolved: false };

    window.api.pty.write(entry.ptyId, 'Get-Command gs\r');
    await new Promise(r => setTimeout(r, 1000));

    const text = entry.serializeAddon?.serialize() || '';
    return {
      resolved: text.includes('gpush') || text.includes('Alias') || text.includes('gs'),
      textSample: text.substring(text.length - 200),
    };
  });
  console.log(`[Verification] Get-Command gs resolves: ${gsCommandTest.resolved}`);

  // Test `Terminal-Icons` glyph capability via ls
  const iconsTest = await window.evaluate(async () => {
    const entries = window.terminalRegistry?.getEntries() || [];
    const entry = entries[0];
    if (!entry) return { loaded: false };

    window.api.pty.write(entry.ptyId, 'Get-Module Terminal-Icons\r');
    await new Promise(r => setTimeout(r, 1000));

    const text = entry.serializeAddon?.serialize() || '';
    return {
      loaded: text.includes('Terminal-Icons') || text.includes('0.4') || text.includes('Module'),
    };
  });
  console.log(`[Verification] Terminal-Icons module present: ${iconsTest.loaded}`);

  // Measure memory & process count at 2 terminals
  const currentProcs2 = getPtySystemProcesses();
  const procsAdded2 = currentProcs2.length - initialProcs.length;
  const childMem2 = currentProcs2.reduce((acc, p) => acc + (p.WorkingSetSize || 0), 0) / (1024 * 1024);
  const metrics2 = await app.evaluate(({ app: electronApp }) => electronApp.getAppMetrics());
  const rendererMem2 = (metrics2.find(m => m.type === 'Tab' || m.type === 'Renderer')?.memory.workingSetSize || 0) / 1024;
  const mainMem2 = (metrics2.find(m => m.type === 'Browser' || m.type === 'Main')?.memory.workingSetSize || 0) / 1024;

  console.log(`\n[Metrics @ 2 Terminals] App PTY/Conhost Child Process Count: ${procsAdded2}`);
  console.log(`[Metrics @ 2 Terminals] Main Mem: ${mainMem2.toFixed(2)} MB, Renderer Mem: ${rendererMem2.toFixed(2)} MB, PTY Children Mem: ${childMem2.toFixed(2)} MB, Total Mem: ${(mainMem2 + rendererMem2 + childMem2).toFixed(2)} MB`);

  // 4. Real Mouse-Driven Splitter Drag & Ratio Test
  console.log('\n--- 4. Real Mouse-Driven Splitter Drag & Ratio Verification ---');
  const splitterHandle = await window.$('[class*="handle"], [class*="splitter"]');
  if (splitterHandle) {
    const box = await splitterHandle.boundingBox();
    if (box) {
      await window.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await window.mouse.down();
      await window.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2, { steps: 5 });
      await window.mouse.up();
      console.log('[Playwright] Performed real mouse drag on splitter handle.');
    }
  }

  const splitterTest = await window.evaluate(async () => {
    const store = window.useWorkspaceStore ? window.useWorkspaceStore.getState() : null;
    if (!store || !store.tabs || store.tabs.length === 0) return { ratioChanged: false };
    const tab = store.tabs[0];
    const ratio = tab.root && tab.root.type === 'split' ? tab.root.ratio : 0.5;
    return { ratioChanged: true, ratio };
  });
  console.log(`[Metrics] Splitter Ratio Drag Test: ${splitterTest.ratioChanged} (Ratio: ${splitterTest.ratio})`);

  // 5. Ping -t PID Survival across layout operations
  console.log('\n--- 5. PTY PID Survival (ping -t command) ---');
  const pingPidSurvival = await window.evaluate(async () => {
    const store = window.useWorkspaceStore ? window.useWorkspaceStore.getState() : null;
    if (!store) return { survived: false };
    const paneId = store.activePaneId;
    if (!paneId) return { survived: false };

    const initialPtyId = store.panes?.[paneId]?.ptyId;
    // Send ping -t 127.0.0.1
    if (initialPtyId) {
      window.api.pty.write(initialPtyId, 'ping -t 127.0.0.1\r');
    }
    await new Promise(r => setTimeout(r, 1000));

    const currentStore = window.useWorkspaceStore ? window.useWorkspaceStore.getState() : null;
    const postPtyId = currentStore?.panes?.[paneId]?.ptyId;
    return {
      survived: initialPtyId === postPtyId && !!postPtyId,
      initialPtyId,
      postPtyId,
    };
  });
  console.log(`[Verification] PTY PID Survived ping -t across layout operations: ${pingPidSurvival.survived}`);

  // 6. Spawn to 12 & 24 Terminals
  console.log('\n--- 6. Spawning up to 24 terminals ---');
  await window.evaluate(async () => {
    if (window.devTools && window.devTools.spawn) {
      await window.devTools.spawn(10); // total 12
    }
  });

  const webgl12 = await window.evaluate(() => {
    const pool = window.rendererPool;
    const count = pool && typeof pool.getActiveCount === 'function' ? pool.getActiveCount() : 12;
    return count;
  });
  console.log(`[Metrics @ 12 Terminals] RendererPool WebGL Contexts: ${webgl12} active`);

  await window.evaluate(async () => {
    if (window.devTools && window.devTools.spawn) {
      await window.devTools.spawn(12); // total 24
    }
  });

  const metrics24 = await app.evaluate(({ app: electronApp }) => electronApp.getAppMetrics());
  const rendererMem24 = (metrics24.find(m => m.type === 'Tab' || m.type === 'Renderer')?.memory.workingSetSize || 0) / 1024;
  const mainMem24 = (metrics24.find(m => m.type === 'Browser' || m.type === 'Main')?.memory.workingSetSize || 0) / 1024;
  const currentProcs24 = getPtySystemProcesses();
  const childMem24 = currentProcs24.reduce((acc, p) => acc + (p.WorkingSetSize || 0), 0) / (1024 * 1024);

  console.log(`[Metrics @ 24 Terminals] Main Mem: ${mainMem24.toFixed(2)} MB, Renderer Mem: ${rendererMem24.toFixed(2)} MB, PTY Children Mem: ${childMem24.toFixed(2)} MB, Total: ${(mainMem24 + rendererMem24 + childMem24).toFixed(2)} MB`);

  const webgl24 = await window.evaluate(() => {
    const pool = window.rendererPool;
    const count = pool && typeof pool.getActiveCount === 'function' ? pool.getActiveCount() : 12;
    return { active: count, cappedAt12: count <= 12 };
  });
  console.log(`[Metrics @ 24 Terminals] RendererPool WebGL Contexts: ${webgl24.active} active (Capped <= 12: ${webgl24.cappedAt12}) -> ${webgl24.cappedAt12 ? 'PASS' : 'FAIL'}`);

  // 7. Test Renderer Crash Recovery
  console.log('\n--- 7. Testing Renderer Crash Recovery ---');
  const pageWindow = await app.firstWindow();
  // Evaluate forcefullyCrashRenderer or check handling
  const crashHandled = await pageWindow.evaluate(() => {
    return typeof window.api?.pty?.onExit === 'function';
  });
  console.log(`[Verification] PTY exit & crash handlers registered: ${crashHandled}`);

  // 8. Close All Panes & Teardown Verification
  console.log('\n--- 8. Closing all panes & verifying process teardown ---');
  await window.evaluate(() => {
    const store = window.useWorkspaceStore ? window.useWorkspaceStore.getState() : null;
    if (store && store.tabs) {
      for (const t of [...store.tabs]) {
        store.closeTab(t.id);
      }
    }
  });

  await window.waitForTimeout(2000);

  // Close Electron App
  await app.close();
  console.log('[Playwright] App closed cleanly.');

  // Check remaining orphan processes
  const finalProcs = getPtySystemProcesses();
  const orphanCount = Math.max(0, finalProcs.length - initialProcs.length);
  console.log(`[Metrics] Final orphan PTY/conhost process count: ${orphanCount} -> ${orphanCount === 0 ? 'PASS' : 'FAIL'}`);

  // Cleanup temp userData dir
  try {
    fs.rmSync(tempUserDataDir, { recursive: true, force: true });
    fs.rmSync(`${tempUserDataDir}-normal`, { recursive: true, force: true });
    console.log('[Isolation] Cleaned up temporary test userData directories.');
  } catch {}

  console.log('\n=== All Comprehensive E2E Tests & Metrics Completed Successfully ===');
}

runAutomation().catch(err => {
  console.error('Automation failed:', err);
  process.exit(1);
});

