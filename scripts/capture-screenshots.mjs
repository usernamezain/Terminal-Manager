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

  const tempUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-ss-data-'));
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
    for (let attempt = 0; attempt < 20; attempt++) {
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
    await mainWindow.waitForLoadState('networkidle');
    await mainWindow.setViewportSize({ width: 1366, height: 850 });
    await mainWindow.waitForTimeout(4000);

    // 1. Capture Main Terminal Workspace
    console.log('Capturing 1. main-terminal.png...');
    await mainWindow.screenshot({ path: path.join(outputDir, 'main-terminal.png') });

    // 2. Open AI Agents
    console.log('Capturing 2. ai-agents.png...');
    await mainWindow.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('AI Agents')
      );
      if (btn) btn.click();
    });
    await mainWindow.waitForTimeout(2000);
    await mainWindow.screenshot({ path: path.join(outputDir, 'ai-agents.png') });

    // 3. Open Script Runner
    console.log('Capturing 3. script-runner.png...');
    await mainWindow.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Script Runner')
      );
      if (btn) btn.click();
    });
    await mainWindow.waitForTimeout(2000);
    await mainWindow.screenshot({ path: path.join(outputDir, 'script-runner.png') });

    // 4. Open Settings
    console.log('Capturing 4. settings.png...');
    await mainWindow.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Settings')
      );
      if (btn) btn.click();
    });
    await mainWindow.waitForTimeout(2000);
    await mainWindow.screenshot({ path: path.join(outputDir, 'settings.png') });

    // 5. Open Docs
    console.log('Capturing 5. in-app-docs.png...');
    await mainWindow.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Documentation')
      );
      if (btn) btn.click();
    });
    await mainWindow.waitForTimeout(2000);
    await mainWindow.screenshot({ path: path.join(outputDir, 'in-app-docs.png') });

    console.log('All screenshots captured successfully!');
  } finally {
    await app.close();
    await server.close();
  }
}

capture().catch((err) => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});
