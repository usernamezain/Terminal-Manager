import { _electron as electron } from 'playwright';
import { createServer } from 'vite';
import path from 'path';
import fs from 'fs';
import os from 'os';

async function capture() {
  const outputDir = path.join(process.cwd(), 'docs', 'assets', 'screenshots');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('1. Starting Vite renderer server...');
  const server = await createServer({
    configFile: path.resolve(process.cwd(), 'vite.renderer.config.ts'),
  });
  await server.listen();
  const address = server.httpServer?.address();
  const port = typeof address === 'object' && address ? address.port : 5173;
  const devUrl = `http://localhost:${port}`;
  console.log(`Vite server running at: ${devUrl}`);

  // Prepare user-data dir with existing shell profile if available to ensure beautiful prompt
  const tempUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-ss-data-'));
  const realAppData = process.env.APPDATA ? path.join(process.env.APPDATA, 'terminal-manager') : null;
  if (realAppData && fs.existsSync(realAppData)) {
    const realShell = path.join(realAppData, 'shell');
    const targetShell = path.join(tempUserDataDir, 'shell');
    if (fs.existsSync(realShell)) {
      try {
        fs.cpSync(realShell, targetShell, { recursive: true });
      } catch (err) {
        console.warn('Could not copy real shell data:', err);
      }
    }
    const realTools = path.join(realAppData, 'tools');
    const targetTools = path.join(tempUserDataDir, 'tools');
    if (fs.existsSync(realTools)) {
      try {
        fs.cpSync(realTools, targetTools, { recursive: true });
      } catch (err) {
        console.warn('Could not copy real tools data:', err);
      }
    }
  }

  console.log('2. Launching Electron via Playwright...');
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${tempUserDataDir}`],
    env: {
      ...process.env,
      NODE_ENV: 'development',
      VITE_DEV_SERVER_URL: devUrl,
      TERMINAL_MANAGER_E2E: '1',
    },
  });

  try {
    // Wait for the window running our devUrl
    let mainWindow = null;
    for (let attempt = 0; attempt < 25; attempt++) {
      const wins = app.windows();
      for (const w of wins) {
        if (w.url().startsWith(devUrl)) {
          mainWindow = w;
          break;
        }
      }
      if (mainWindow) break;
      await new Promise((r) => setTimeout(r, 500));
    }

    if (!mainWindow) {
      const wins = app.windows();
      mainWindow = wins.find((w) => !w.url().includes('devtools')) || wins[0];
    }

    console.log(`Main window found: ${mainWindow.url()}`);
    await mainWindow.waitForLoadState('domcontentloaded');
    await mainWindow.setViewportSize({ width: 1400, height: 880 });
    await mainWindow.waitForTimeout(4000);

    // Expand sidebar for clean visual structure
    try {
      const expandBtn = await mainWindow.$('button[title="Expand Sidebar"]');
      if (expandBtn) {
        await expandBtn.click();
        await mainWindow.waitForTimeout(500);
      }
    } catch (e) {
      console.warn('Could not expand sidebar:', e);
    }

    // 1. Capture Main Terminal Workspace
    console.log('Capturing 1. main-terminal.png...');
    await mainWindow.evaluate(() => {
      const btn = document.querySelector('button[title="Terminals"]');
      if (btn) btn.click();
    });
    await mainWindow.waitForTimeout(1000);

    try {
      await mainWindow.click('.xterm-screen', { timeout: 3000 }).catch(() => {});
      await mainWindow.keyboard.type('cls', { delay: 30 });
      await mainWindow.keyboard.press('Enter');
      await mainWindow.waitForTimeout(1500);
      await mainWindow.keyboard.type('Write-Host "Terminal Manager v0.1.0 -- Fast, Multi-Tab PTY Workspace" -ForegroundColor Cyan', { delay: 15 });
      await mainWindow.keyboard.press('Enter');
      await mainWindow.waitForTimeout(1500);
    } catch (e) {
      console.warn('Terminal typing error:', e);
    }

    await mainWindow.screenshot({ path: path.join(outputDir, 'main-terminal.png') });
    console.log('Saved main-terminal.png');

    // 2. Open AI Agents
    console.log('Capturing 2. ai-agents.png...');
    await mainWindow.evaluate(() => {
      const btn = document.querySelector('button[title="AI Agents"]');
      if (btn) btn.click();
    });
    // Wait for agent items to scan and populate
    await mainWindow.waitForFunction(() => {
      const items = document.querySelectorAll('[class*="agentItem"]');
      return items.length > 0;
    }, { timeout: 8000 }).catch(() => {});
    await mainWindow.waitForTimeout(2000);

    // Select the first agent item to show details
    await mainWindow.evaluate(() => {
      const item = document.querySelector('[class*="agentItem"]');
      if (item) item.click();
    });
    await mainWindow.waitForTimeout(1500);
    await mainWindow.screenshot({ path: path.join(outputDir, 'ai-agents.png') });
    console.log('Saved ai-agents.png');

    // 3. Open Script Runner
    console.log('Capturing 3. script-runner.png...');
    await mainWindow.evaluate(() => {
      const btn = document.querySelector('button[title="Script Runner"]');
      if (btn) btn.click();
    });
    await mainWindow.waitForTimeout(1000);
    // Click "+ New" button to open the script editor with a template
    await mainWindow.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const newBtn = buttons.find((b) => b.textContent && b.textContent.includes('New'));
      if (newBtn) newBtn.click();
    });
    await mainWindow.waitForTimeout(2000);
    await mainWindow.screenshot({ path: path.join(outputDir, 'script-runner.png') });
    console.log('Saved script-runner.png');

    // 4. Open Settings (Shell Experience & Themes)
    console.log('Capturing 4. settings.png...');
    await mainWindow.evaluate(() => {
      const btn = document.querySelector('button[title="Settings"]');
      if (btn) btn.click();
    });
    await mainWindow.waitForTimeout(1500);
    // Switch to Shell Experience / Prompt Gallery or Overview
    await mainWindow.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const promptBtn = buttons.find((b) => b.textContent && b.textContent.includes('Prompt Gallery'));
      if (promptBtn) {
        promptBtn.click();
      } else {
        const overviewBtn = buttons.find((b) => b.textContent && b.textContent.includes('Overview'));
        if (overviewBtn) overviewBtn.click();
      }
    });
    await mainWindow.waitForTimeout(2500);
    await mainWindow.screenshot({ path: path.join(outputDir, 'settings.png') });
    console.log('Saved settings.png');

    // 5. Open Docs
    console.log('Capturing 5. in-app-docs.png...');
    await mainWindow.evaluate(() => {
      const btn = document.querySelector('button[title="Documentation"]');
      if (btn) btn.click();
    });
    await mainWindow.waitForTimeout(2500);
    await mainWindow.screenshot({ path: path.join(outputDir, 'in-app-docs.png') });
    console.log('Saved in-app-docs.png');

    console.log('All 5 screenshots captured successfully with distinct views and clean terminal!');
  } finally {
    await app.close();
    await server.close();
  }
}

capture().catch((err) => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});
