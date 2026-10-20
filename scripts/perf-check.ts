import fs from 'fs';
import path from 'path';

interface BudgetsConfig {
  budgets: Record<string, number>;
  maxAllowedToleranceRatio: number;
}

function runCheck() {
  console.log('=== Performance Budget Verification (npm run perf:check) ===\n');

  const budgetsPath = path.join(process.cwd(), 'perf-budgets.json');
  const baselinePath = path.join(process.cwd(), 'perf-baseline.json');

  if (!fs.existsSync(budgetsPath)) {
    console.error('ERROR: perf-budgets.json not found!');
    process.exit(1);
  }

  const budgetsConfig: BudgetsConfig = JSON.parse(fs.readFileSync(budgetsPath, 'utf8'));
  const budgets = budgetsConfig.budgets;
  const tolerance = budgetsConfig.maxAllowedToleranceRatio || 0.10;

  if (!fs.existsSync(baselinePath)) {
    console.warn('WARN: perf-baseline.json not found. Run "npm run perf:bench" to collect measurements.');
    console.log('Validating budget configuration syntax only: PASS.');
    return;
  }

  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

  const metricsMap: Record<string, number> = {
    firstWindowShownMs: baseline.startup?.firstWindowShownMs || 0,
    firstPromptFastStartOnMs: baseline.startup?.firstPromptFastStartOnMs || 0,
    firstPromptFastStartOffMs: baseline.startup?.firstPromptFastStartOffMs || 0,
    openSettingsMs: baseline.panelOpenTimesMs?.settings || 0,
    openProfilesMs: baseline.panelOpenTimesMs?.profiles || 0,
    openScriptRunnerMs: baseline.panelOpenTimesMs?.scriptRunner || 0,
    openAgentsMs: baseline.panelOpenTimesMs?.agents || 0,
    openDocsMs: baseline.panelOpenTimesMs?.documentation || 0,
    idleCpuPercent: baseline.idle60s?.totalIdleCpuPercent || 0,
    idleMemoryMb: baseline.idle60s?.totalIdleMemoryMb || 0,
    memory1TerminalMb: baseline.terminalsMemoryMb?.count1 || 0,
    memory5TerminalsMb: baseline.terminalsMemoryMb?.count5 || 0,
    memory10TerminalsMb: baseline.terminalsMemoryMb?.count10 || 0,
    panelsRepetitionDeltaMb: baseline.repetitionTest?.panelsOpened50xDeltaMb || 0,
    ptyThroughputDurationMs: baseline.ptyThroughput?.durationMs || 0,
    ctrlCResponseMs: baseline.ptyThroughput?.ctrlCResponseMs || 0,
    keystrokeToEchoMs: baseline.latency?.keystrokeToEchoMs || 0,
    search100kLinesMs: baseline.latency?.search100kLinesMs || 0,
    trayModeIdleCpuPercent: baseline.trayMode?.idleCpuPercent || 0,
    trayModeMemoryMb: baseline.trayMode?.memoryMb || 0,
    installerSizeMb: baseline.sizes?.installerMb || 0,
    unpackedSizeMb: baseline.sizes?.unpackedMb || 0,
    appAsarSizeMb: baseline.sizes?.appAsarMb || 0,
  };

  let failureCount = 0;
  console.log('| Metric Key | Budget | Measured | Ceiling (+10%) | Status |');
  console.log('| :--- | :--- | :--- | :--- | :--- |');

  for (const [key, budgetVal] of Object.entries(budgets)) {
    const measuredVal = metricsMap[key];
    if (measuredVal === undefined) continue;

    const ceiling = Math.round(budgetVal * (1 + tolerance) * 100) / 100;
    const passed = measuredVal <= ceiling;

    if (!passed) {
      failureCount++;
    }

    console.log(`| ${key} | ${budgetVal} | ${measuredVal} | ${ceiling} | ${passed ? 'PASS' : 'FAIL'} |`);
  }

  console.log('\n-------------------------------------------------------------');
  if (failureCount > 0) {
    console.error(`[FAIL] ${failureCount} performance budget(s) exceeded the allowed +10% limit!`);
    process.exit(1);
  } else {
    console.log('[PASS] All performance budgets are within the allowed limits.');
  }
}

runCheck();
