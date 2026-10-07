import { spawn } from 'child_process';
import { createServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function startDev() {
  console.log('Building main & preload...');
  await runCommand('npx', ['vite', 'build', '--config', 'vite.main.config.ts']);
  await runCommand('npx', ['vite', 'build', '--config', 'vite.preload.config.ts']);

  console.log('Starting Vite renderer dev server...');
  const server = await createServer({
    configFile: path.resolve(root, 'vite.renderer.config.ts'),
  });
  await server.listen();

  const address = server.httpServer?.address();
  const port = typeof address === 'object' && address ? address.port : 5173;
  const devUrl = `http://localhost:${port}`;
  console.log(`Vite renderer dev server running at: ${devUrl}`);

  console.log('Launching Electron desktop window...');
  const electronProcess = spawn('npx', ['electron', '.'], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      VITE_DEV_SERVER_URL: devUrl,
    },
    stdio: 'inherit',
    shell: true,
  });

  electronProcess.on('close', (code) => {
    console.log(`Electron desktop window exited with code ${code}`);
    server.close();
    process.exit(code || 0);
  });
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit', shell: true });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command ${command} ${args.join(' ')} failed with code ${code}`));
    });
  });
}

startDev().catch((err) => {
  console.error(err);
  process.exit(1);
});
