import { _electron as electron } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Path with space to verify space-in-path handling
const spaceUserDataDir = path.resolve(rootDir, 'scratch/test space dir/userData');

async function runPhase3ToolsE2ETest() {
  console.log('[E2E Phase 3] Starting Playwright System Tools Verification...');
  console.log(`[E2E Phase 3] Isolated userData path with space: ${spaceUserDataDir}`);

  if (!fs.existsSync(spaceUserDataDir)) {
    fs.mkdirSync(spaceUserDataDir, { recursive: true });
  }

  const app = await electron.launch({
    args: ['.', `--user-data-dir=${spaceUserDataDir}`],
    cwd: rootDir,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      TERMINAL_MANAGER_E2E: '1',
    },
  });

  try {
    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    console.log('[E2E Phase 3] App main window loaded successfully.');

    // Step 1: Verify System Tools Sidebar Nav Item
    const toolsSidebarBtn = page.locator('button:has-text("System Tools"), button[title*="System Tools"], button:has(svg.lucide-wrench)').first();
    await toolsSidebarBtn.click();
    console.log('[E2E Phase 3] Clicked System Tools sidebar item.');

    // Step 2: Verify System Tools Header
    await page.waitForSelector('h2:has-text("System Tools")');
    console.log('[E2E Phase 3] System Tools view rendered.');

    // Step 3: Test Launch Tools -> Confirm Modal -> Cancel
    const launchBtn = page.locator('button:has-text("Launch Tools")');
    await launchBtn.click();

    await page.waitForSelector('text=Confirm Administrator Execution');
    console.log('[E2E Phase 3] Confirmation Modal popped up.');

    const cancelBtn = page.locator('button:has-text("Cancel")');
    await cancelBtn.click();
    console.log('[E2E Phase 3] Cancel button clicked. No execution triggered.');

    // Step 4: Test Launch Tools -> Confirm -> Run Stub Execution
    await launchBtn.click();
    await page.waitForSelector('text=Confirm Administrator Execution');

    const runBtn = page.locator('button:has-text("Run as Administrator")');
    await runBtn.click();
    console.log('[E2E Phase 3] Confirmed launch. Stub runner invoked.');

    // Step 5: Test Third-Party Licenses Modal
    const licenseLink = page.locator('text=Third-party licenses');
    await licenseLink.click();
    await page.waitForSelector('text=Copyright (c) 2022 CT Tech Group LLC');
    console.log('[E2E Phase 3] Third-party license modal contains copyright notice.');

    const closeLicenseBtn = page.locator('button:has-text("Close")');
    await closeLicenseBtn.click();

    console.log('[E2E Phase 3 SUCCESS] All Playwright E2E checks passed cleanly!');
  } catch (err) {
    console.error('[E2E Phase 3 ERROR]', err);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

runPhase3ToolsE2ETest();
